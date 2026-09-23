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
      <el-alert class="schedule-tip" title="先选择目标节点，再选择复制或迁移；目标节点具有计算能力时可同时发起计算调度，数据已在该节点时直接原位计算。" type="info" :closable="false" show-icon />
      <el-alert v-if="loadError" class="schedule-tip" :title="loadError" type="error" :closable="false" show-icon />
      <el-alert v-else-if="unavailableReason" class="schedule-tip" :title="unavailableReason" type="warning" :closable="false" show-icon />
      <el-form label-width="100px" :disabled="loading || submitting || !!acceptedPlan" @submit.native.prevent="submit">
        <el-form-item label="目标节点" required>
          <el-select v-model="form.targetNodeId" class="full-width" filterable placeholder="请选择目标节点" @change="syncTarget">
            <el-option v-for="node in targetNodes" :key="node.nodeId" :value="node.nodeId" :label="targetLabel(node)" />
          </el-select>
          <div v-if="targetHint" class="field-hint">{{ targetHint }}</div>
        </el-form-item>
        <el-form-item label="源副本" required>
          <el-select v-model="form.replicaId" class="full-width" placeholder="请选择可用副本">
            <el-option v-for="replica in sourceReplicas" :key="replica.replicaId" :value="replica.replicaId" :label="replicaLabel(replica)" />
          </el-select>
          <div v-if="sourceReplica" class="field-hint">{{ sourceReplica.filePath }} · {{ formatBytes(sourceReplica.sizeBytes) }}</div>
        </el-form-item>
        <el-form-item label="调度方式" required>
          <span v-if="inPlace">原位计算（数据已在目标节点，无需复制或迁移）</span>
          <template v-else>
            <el-radio-group v-model="form.action">
              <el-radio v-for="action in actions" :key="action.value" :label="action.value">{{ action.label }}</el-radio>
            </el-radio-group>
            <div class="field-hint" :class="{ 'move-warning': form.action === 'MOVE' }">{{ actionDescription }}</div>
          </template>
        </el-form-item>
        <el-form-item v-if="computeNode && !inPlace" label="计算调度">
          <el-checkbox v-model="form.compute" @change="syncImage">数据到达后在目标节点运行计算</el-checkbox>
        </el-form-item>
        <el-form-item v-if="withCompute" label="运行镜像" required>
          <el-select v-model="form.runtimeImageId" class="full-width" filterable :loading="imagesLoading" placeholder="请选择运行镜像">
            <el-option v-for="image in images" :key="image.imageId" :value="image.imageId" :label="imageLabel(image)" />
          </el-select>
          <div class="field-hint">{{ inPlace ? '直接使用目标节点上已有的数据运行该镜像。' : '数据传输完成后在目标节点运行该镜像。' }}提交后生成计算任务并开始执行，不修改数据集的默认镜像。</div>
          <div v-if="imageError || (!imagesLoading && !images.length)" class="field-hint">
            {{ imageError || '暂无已验证并启用的镜像，请先到镜像注册页面配置。' }}
            <el-button type="text" size="mini" :loading="imagesLoading" @click="loadImages">重新加载镜像</el-button>
          </div>
        </el-form-item>
      </el-form>
      <el-alert v-if="submitError" class="schedule-tip" :title="submitError" type="error" :closable="false" show-icon />
      <el-alert v-if="acceptedPlan" :title="acceptedMessage" :description="computeTask ? '任务已创建并开始执行，进度与结果请到调度日志查看。' : ''" type="success" :closable="false" show-icon />
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
import { fetchSchedulableDatasets, fetchSchedulingPlan, submitDatasetSchedule, submitComputeSchedule } from '@/api/schedulingApi'
import { fetchAllPages, formatBytes } from '@/utils/dataset-catalog'

const actions = [
  { value: 'COPY', label: '复制', description: '复制到目标节点，保留源节点上的副本。' },
  { value: 'MOVE', label: '迁移', description: '复制成功后删除源文件，将副本迁移到目标节点。此操作会移除源副本，请谨慎选择。' }
]

export default {
  name: 'ManualScheduleDialog',
  data() {
    return {
      visible: false, loading: false, submitting: false, loadVersion: 0,
      dataset: {}, replicas: [], nodes: [],
      images: [], imagesLoading: false, imagesLoaded: false, imageError: '',
      actions, form: { targetNodeId: null, replicaId: null, action: 'COPY', compute: false, runtimeImageId: null },
      loadError: '', submitError: '', acceptedPlan: null, computeTask: null, pendingPlan: null
    }
  },
  computed: {
    // A node that already holds a usable replica needs no transfer, so it is a target only for in-place compute.
    targetNodes() { return this.nodes.filter(node => this.hostsReplica(node) ? this.isComputeNode(node) : this.isStorageNode(node)) },
    targetNode() { return this.targetNodes.find(node => node.nodeId === this.form.targetNodeId) },
    inPlace() { return this.hostsReplica(this.targetNode) },
    computeNode() { return this.isComputeNode(this.targetNode) ? this.targetNode : null },
    withCompute() { return this.inPlace || (!!this.computeNode && this.form.compute) },
    sourceReplicas() { return this.inPlace ? this.replicas.filter(replica => replica.nodeId === this.targetNode.nodeId) : this.replicas },
    sourceReplica() { return this.sourceReplicas.find(replica => replica.replicaId === this.form.replicaId) },
    targetHint() {
      if (!this.targetNode) return ''
      if (this.inPlace) return '该节点已有此数据集的可用副本且具有计算能力，将直接在该节点计算。'
      return this.computeNode ? '该节点具有计算能力，可仅调度数据，也可在数据到达后运行计算。' : '该节点仅提供存储，只调度数据，不运行计算。'
    },
    actionDescription() { return (actions.find(action => action.value === this.form.action) || {}).description },
    unavailableReason() {
      if (this.loading || this.loadError) return ''
      if (!this.replicas.length) return '该数据集当前没有可调度副本，请在注册中心检查激活状态和副本健康。'
      if (!this.targetNodes.length) return '当前没有可用的目标节点：需要其他可调度的存储节点，或数据所在节点具有计算能力。'
      return ''
    },
    canSubmit() {
      return !this.loading && !this.submitting && !this.loadError && !this.unavailableReason && !this.acceptedPlan &&
        !!this.targetNode && !!this.sourceReplica && (this.inPlace || actions.some(action => action.value === this.form.action)) &&
        (!this.withCompute || (!this.imagesLoading && !this.imageError && this.images.some(image => image.imageId === this.form.runtimeImageId)))
    },
    acceptedMessage() {
      if (!this.acceptedPlan) return ''
      const plan = `调度计划 #${this.acceptedPlan.planId}`
      if (!this.computeTask) return `${plan} 已提交，请到调度日志查看执行结果。`
      return this.computeTask.taskId == null
        ? `计算调度已提交（${plan}），任务 ID 暂未获取，请到调度日志查看。`
        : `计算调度已提交，任务 ID：#${this.computeTask.taskId}（${plan}）`
    }
  },
  beforeDestroy() { this.loadVersion++ },
  methods: {
    formatBytes,
    isComputeNode(node) { return !!node && ['COMPUTE', 'COMPUTE_STORAGE'].includes(node.role) },
    isStorageNode(node) { return !!node && ['STORAGE', 'COMPUTE_STORAGE'].includes(node.role) },
    hostsReplica(node) { return !!node && this.replicas.some(replica => replica.nodeId === node.nodeId) },
    imageLabel(image) {
      const isDefault = image.imageId === this.dataset.defaultRuntimeImageId
      const type = [image.taskType, image.modelType].filter(Boolean).join(' / ')
      return `${isDefault ? '【数据集默认】' : ''}${image.name}${type ? `（${type}）` : ''} · ${image.imageRef}`
    },
    nodeLabel(node) { return `${node.displayName || node.k8sNodeName || '节点'} #${node.nodeId} (${node.role})` },
    targetLabel(node) {
      const suffix = this.hostsReplica(node) ? ' · 已有副本，原位计算' : this.isComputeNode(node) ? ' · 可计算' : ''
      return `${this.nodeLabel(node)}${suffix}`
    },
    replicaLabel(replica) { return `${replica.nodeName || '节点'} #${replica.nodeId} · 副本 #${replica.replicaId}` },
    open(dataset) {
      this.dataset = { ...dataset }
      this.form = { targetNodeId: null, replicaId: null, action: 'COPY', compute: false, runtimeImageId: null }
      this.acceptedPlan = null
      this.computeTask = null
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
      if (!this.targetNode) this.form.targetNodeId = null
      // In-place compute must read the replica on the target; any replica can feed a transfer.
      if (!this.sourceReplica) this.form.replicaId = this.sourceReplicas.length ? this.sourceReplicas[0].replicaId : null
      if (!this.computeNode) this.form.compute = false
      this.syncImage()
    },
    syncImage() {
      if (!this.withCompute) this.form.runtimeImageId = null
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
        const compute = this.withCompute
        if (!this.inPlace && this.form.action === 'MOVE') {
          await this.$confirm(`将数据集“${this.dataset.name}”从节点 #${this.sourceReplica.nodeId} 迁移到节点 #${this.form.targetNodeId}。复制后会删除源文件，是否继续？`, '确认迁移数据集', {
            type: 'warning', confirmButtonText: '确认迁移', cancelButtonText: '取消'
          })
        }
        const assignment = {
          datasetId: this.dataset.datasetId, replicaId: this.sourceReplica.replicaId,
          sourceNodeId: this.sourceReplica.nodeId, targetNodeId: this.form.targetNodeId,
          action: this.inPlace ? 'USE_IN_PLACE' : compute ? `${this.form.action}_AND_USE` : this.form.action
        }
        const runtimeImageId = compute ? this.form.runtimeImageId : undefined
        // An unchanged retry must not create a second asynchronous execution.
        if (!this.pendingPlan || this.pendingPlan.runtimeImageId !== runtimeImageId || JSON.stringify(this.pendingPlan.assignments[0]) !== JSON.stringify(assignment)) {
          const id = `manual-${requestId()}`
          this.pendingPlan = {
            externalPlanId: id, algorithm: { name: '手动数据调度', version: '1.0' }, assignments: [assignment],
            ...(compute ? { taskId: id, runtimeImageId } : {})
          }
        }
        const accepted = await (compute ? submitComputeSchedule : submitDatasetSchedule)(this.pendingPlan)
        this.computeTask = compute ? { taskId: await this.findTaskId(accepted) } : null
        this.acceptedPlan = accepted
        this.$emit('submitted', accepted)
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
    // accepted.taskId echoes our external string; internalTaskId is the numeric task_management ID.
    // Older backends only expose it on the plan record.
    async findTaskId(accepted) {
      if (accepted && accepted.internalTaskId != null) return accepted.internalTaskId
      try {
        const detail = await fetchSchedulingPlan(accepted.planId)
        return detail && detail.plan && detail.plan.internalTaskId != null ? detail.plan.internalTaskId : null
      } catch (error) {
        return null
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
