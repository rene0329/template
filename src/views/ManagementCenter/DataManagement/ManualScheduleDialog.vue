<template>
  <el-dialog
    title="手动调度数据集"
    :visible.sync="visible"
    width="640px"
    custom-class="manual-schedule-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="close"
  >
    <div v-loading="loading">
      <div class="dataset-summary">
        <strong>{{ dataset.name }}</strong>
        <span>{{ dataset.datasetCode }} / {{ dataset.version }} · ID {{ dataset.datasetId }}</span>
      </div>
      <el-alert class="schedule-tip" title="支持复制、迁移或原位计算；计算节点可选择运行镜像，结果可在调度日志中查看。" type="info" :closable="false" show-icon />
      <el-alert v-if="loadError" class="schedule-tip" :title="loadError" type="error" :closable="false" show-icon />
      <el-alert v-else-if="unavailableReason" class="schedule-tip" :title="unavailableReason" type="warning" :closable="false" show-icon />
      <el-form label-width="100px" :disabled="loading || submitting || !!acceptedPlan" @submit.native.prevent="submit">
        <el-form-item label="源副本" required>
          <el-select v-model="form.replicaId" class="full-width" placeholder="请选择可用副本" @change="syncTarget">
            <el-option v-for="replica in replicas" :key="replica.replicaId" :value="replica.replicaId" :label="replicaLabel(replica)" />
          </el-select>
          <div v-if="sourceReplica" class="field-hint">{{ sourceReplica.filePath }} · {{ formatBytes(sourceReplica.sizeBytes) }}</div>
        </el-form-item>
        <el-form-item label="调度方式" required>
          <el-select v-model="form.action" class="full-width" @change="syncTarget">
            <el-option v-for="action in actions" :key="action.value" :value="action.value" :label="action.label" :disabled="action.value === 'USE_IN_PLACE' && !sourceCanCompute" />
          </el-select>
          <div class="field-hint" :class="{ 'move-warning': form.action === 'MOVE' }">{{ actionDescription }}</div>
        </el-form-item>
        <el-form-item v-if="!inPlace" label="目标节点" required>
          <el-select v-model="form.targetNodeId" class="full-width" filterable placeholder="请选择目标存储节点" @change="syncImage">
            <el-option v-for="node in targetNodes" :key="node.nodeId" :value="node.nodeId" :label="nodeLabel(node)" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="计算节点">
          <span>{{ sourceNode ? nodeLabel(sourceNode) : '请选择具有计算能力的源副本' }}</span>
        </el-form-item>
        <el-form-item v-if="computeNode" label="运行镜像" :required="inPlace">
          <el-select v-model="form.runtimeImageId" class="full-width" filterable clearable :loading="imagesLoading" :placeholder="inPlace ? '请选择运行镜像' : '不选择镜像，仅调度数据'">
            <el-option v-for="image in images" :key="image.imageId" :value="image.imageId" :label="imageLabel(image)" />
          </el-select>
          <div class="field-hint">{{ inPlace ? '直接使用源节点上的数据进行计算，不复制或迁移数据。' : '选择镜像后，数据传输完成将在目标节点运行该镜像；不选择则仅传输数据。' }} 不修改数据集的默认镜像。</div>
          <div v-if="imageError || (!imagesLoading && !images.length)" class="field-hint">
            {{ imageError || '暂无已验证并启用的镜像，请先到镜像注册页面配置。' }}
            <el-button type="text" size="mini" :loading="imagesLoading" @click="loadImages">重新加载镜像</el-button>
          </div>
        </el-form-item>
      </el-form>
      <el-alert v-if="submitError" class="schedule-tip" :title="submitError" type="error" :closable="false" show-icon />
      <el-alert v-if="acceptedPlan" :title="`调度计划 #${acceptedPlan.planId} 已提交，请到调度日志查看执行结果。`" type="success" :closable="false" show-icon />
    </div>
    <span slot="footer">
      <el-button v-if="loadError" :loading="loading" @click="loadOptions">重新加载</el-button>
      <el-button :disabled="submitting" @click="visible = false">{{ acceptedPlan ? '关闭' : '取消' }}</el-button>
      <el-button v-if="acceptedPlan" type="primary" @click="viewLogs">查看调度日志</el-button>
      <el-button v-else type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">提交调度</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { fetchRegisteredNodes, fetchRuntimeImages, requestId } from '@/api/registrationApi'
import { fetchSchedulableDatasets, submitDatasetSchedule, submitComputeSchedule } from '@/api/schedulingApi'
import { fetchAllPages, formatBytes } from '@/utils/dataset-catalog'

const actions = [
  { value: 'COPY', label: '复制', description: '复制到目标存储节点，保留源节点上的副本。' },
  { value: 'MOVE', label: '迁移', description: '复制成功后删除源文件，将副本迁移到目标存储节点。此操作会移除源副本，请谨慎选择。' },
  { value: 'USE_IN_PLACE', label: '原位计算', description: '在数据所在节点直接运行所选镜像，要求源节点具有 COMPUTE 属性。' }
]

export default {
  name: 'ManualScheduleDialog',
  data() {
    return {
      visible: false, loading: false, submitting: false, loadVersion: 0,
      dataset: {}, replicas: [], nodes: [],
      images: [], imagesLoading: false, imagesLoaded: false, imageError: '',
      actions, form: { replicaId: null, targetNodeId: null, action: 'COPY', runtimeImageId: null },
      loadError: '', submitError: '', acceptedPlan: null, pendingPlan: null
    }
  },
  computed: {
    sourceReplica() { return this.replicas.find(replica => replica.replicaId === this.form.replicaId) },
    sourceNode() { return this.sourceReplica && this.nodes.find(node => node.nodeId === this.sourceReplica.nodeId) },
    sourceCanCompute() { return this.isComputeNode(this.sourceNode) },
    inPlace() { return this.form.action === 'USE_IN_PLACE' },
    computeNode() {
      const node = this.inPlace ? this.sourceNode : this.targetNodes.find(node => node.nodeId === this.form.targetNodeId)
      return this.isComputeNode(node) ? node : null
    },
    withCompute() { return this.inPlace || (!!this.computeNode && !!this.form.runtimeImageId) },
    targetNodes() {
      if (!this.sourceReplica) return []
      return this.nodes.filter(node => node.nodeId !== this.sourceReplica.nodeId && ['STORAGE', 'COMPUTE_STORAGE'].includes(node.role))
    },
    actionDescription() { return (actions.find(action => action.value === this.form.action) || {}).description },
    unavailableReason() {
      if (this.loading || this.loadError) return ''
      if (!this.replicas.length) return '该数据集当前没有可调度副本，请在注册中心检查激活状态和副本健康。'
      if (this.inPlace && !this.sourceCanCompute) return '原位计算需要选择具有 COMPUTE 属性的源节点副本。'
      if (!this.inPlace && !this.targetNodes.length) return '当前没有可用的目标存储节点。'
      return ''
    },
    canSubmit() {
      return !this.loading && !this.submitting && !this.loadError && !this.unavailableReason && !this.acceptedPlan &&
        actions.some(action => action.value === this.form.action) && !!this.sourceReplica &&
        (this.inPlace ? this.sourceCanCompute : this.targetNodes.some(node => node.nodeId === this.form.targetNodeId)) &&
        (!this.withCompute || (!this.imagesLoading && !this.imageError && this.images.some(image => image.imageId === this.form.runtimeImageId)))
    }
  },
  beforeDestroy() { this.loadVersion++ },
  methods: {
    formatBytes,
    isComputeNode(node) { return !!node && ['COMPUTE', 'COMPUTE_STORAGE'].includes(node.role) },
    imageLabel(image) {
      const isDefault = image.imageId === this.dataset.defaultRuntimeImageId
      const type = [image.taskType, image.modelType].filter(Boolean).join(' / ')
      return `${isDefault ? '【数据集默认】' : ''}${image.name}${type ? `（${type}）` : ''} · ${image.imageRef}`
    },
    nodeLabel(node) { return `${node.displayName || node.k8sNodeName || '节点'} #${node.nodeId} (${node.role})` },
    replicaLabel(replica) { return `${replica.nodeName || '节点'} #${replica.nodeId} · 副本 #${replica.replicaId}` },
    open(dataset) {
      this.dataset = { ...dataset }
      this.form = { replicaId: null, targetNodeId: null, action: 'COPY', runtimeImageId: null }
      this.acceptedPlan = null
      this.pendingPlan = null
      this.submitError = ''
      this.visible = true
      return this.loadOptions()
    },
    async loadOptions() {
      const version = ++this.loadVersion
      this.loading = true
      this.loadError = ''
      this.replicas = []
      this.nodes = []
      this.images = []
      this.imagesLoaded = false
      this.imagesLoading = false
      this.imageError = ''
      try {
        const [datasets, nodes] = await Promise.all([
          fetchSchedulableDatasets({ datasetIds: String(this.dataset.datasetId), page: 1, pageSize: 1 }),
          fetchAllPages(params => fetchRegisteredNodes({ ...params, status: 'ACTIVE', enabled: true }))
        ])
        if (version !== this.loadVersion) return
        const dataset = datasets.list.find(item => item.datasetId === this.dataset.datasetId)
        this.replicas = dataset ? dataset.replicas.filter(replica => replica.availability === 'AVAILABLE') : []
        this.nodes = nodes.filter(node => node.schedulable)
        this.form.replicaId = this.replicas.length ? this.replicas[0].replicaId : null
        this.syncTarget()
      } catch (error) {
        if (version === this.loadVersion) this.loadError = `调度资源加载失败：${error.message}`
      } finally {
        if (version === this.loadVersion) this.loading = false
      }
    },
    syncTarget() {
      if (!this.targetNodes.some(node => node.nodeId === this.form.targetNodeId)) {
        this.form.targetNodeId = null
      }
      this.syncImage()
    },
    syncImage() {
      if (!this.computeNode) this.form.runtimeImageId = null
      else if (!this.imagesLoaded && !this.imagesLoading) this.loadImages()
    },
    async loadImages() {
      const version = this.loadVersion
      this.imagesLoading = true
      this.imageError = ''
      try {
        const images = await fetchAllPages(params => fetchRuntimeImages({ ...params, status: 'READY', enabled: true }))
        if (version !== this.loadVersion) return
        this.images = images.filter(image => image.status === 'READY' && image.enabled && image.resolvedDigest)
          .sort((a, b) => Number(b.imageId === this.dataset.defaultRuntimeImageId) - Number(a.imageId === this.dataset.defaultRuntimeImageId))
        this.imagesLoaded = true
        if (!this.images.some(image => image.imageId === this.form.runtimeImageId)) this.form.runtimeImageId = null
      } catch (error) {
        if (version === this.loadVersion) this.imageError = `镜像加载失败：${error.message}`
      } finally {
        if (version === this.loadVersion) this.imagesLoading = false
      }
    },
    async submit() {
      if (!this.canSubmit) return
      this.submitting = true
      this.submitError = ''
      try {
        if (this.form.action === 'MOVE') {
          await this.$confirm(`将数据集“${this.dataset.name}”从节点 #${this.sourceReplica.nodeId} 迁移到节点 #${this.form.targetNodeId}。复制后会删除源文件，是否继续？`, '确认迁移数据集', {
            type: 'warning', confirmButtonText: '确认迁移', cancelButtonText: '取消'
          })
        }
        const assignment = {
          datasetId: this.dataset.datasetId, replicaId: this.sourceReplica.replicaId,
          sourceNodeId: this.sourceReplica.nodeId,
          targetNodeId: this.inPlace ? this.sourceReplica.nodeId : this.form.targetNodeId,
          action: this.withCompute && !this.inPlace ? `${this.form.action}_AND_USE` : this.form.action
        }
        const runtimeImageId = this.withCompute ? this.form.runtimeImageId : undefined
        // An unchanged retry must not create a second asynchronous execution.
        if (!this.pendingPlan || this.pendingPlan.runtimeImageId !== runtimeImageId || JSON.stringify(this.pendingPlan.assignments[0]) !== JSON.stringify(assignment)) {
          const id = `manual-${requestId()}`
          this.pendingPlan = {
            externalPlanId: id, algorithm: { name: '手动数据调度', version: '1.0' }, assignments: [assignment],
            ...(this.withCompute ? { taskId: id, runtimeImageId } : {})
          }
        }
        this.acceptedPlan = await (this.withCompute ? submitComputeSchedule : submitDatasetSchedule)(this.pendingPlan)
        this.$emit('submitted', this.acceptedPlan)
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
          this.submitError = error.status === 404 || error.status === 405
            ? '当前后端尚未支持此调度接口，请更新后端后重试。'
            : `调度提交失败：${error.message || error}`
        }
      } finally {
        this.submitting = false
      }
    },
    close() { this.loadVersion++ },
    viewLogs() {
      this.visible = false
      this.$router.push({ name: 'SchedulingLogs' })
    }
  }
}
</script>

<style scoped>
.dataset-summary { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; overflow-wrap: anywhere; }
.dataset-summary strong { font-size: 16px; color: #303133; }
.dataset-summary span, .field-hint { color: #909399; font-size: 12px; }
.field-hint { margin-top: 6px; line-height: 1.6; overflow-wrap: anywhere; }
.move-warning { color: #e6a23c; }
.schedule-tip { margin-bottom: 16px; }
.full-width { width: 100%; }
</style>
