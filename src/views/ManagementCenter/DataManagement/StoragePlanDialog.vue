<template>
  <el-dialog :title="title" :visible.sync="visible" width="820px" :close-on-click-modal="false" :show-close="!submitting" :close-on-press-escape="!submitting">
    <div v-loading="loading">
      <el-form v-if="mode === 'aggregation'" label-width="120px">
        <el-form-item label="任务所需数据集">
          <el-select v-model="datasetIds" multiple filterable style="width: 100%" :disabled="loading || submitting || !!accepted" placeholder="选择本次计算需要的数据" @change="invalidatePreview">
            <el-option v-for="dataset in datasets" :key="dataset.datasetId" :label="`${dataset.name} #${dataset.datasetId}`" :value="dataset.datasetId" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标计算节点">
          <el-select v-model="targetNodeId" filterable style="width: 100%" :disabled="loading || submitting || !!accepted" placeholder="选择本次计算的目标节点" @change="invalidatePreview">
            <el-option v-for="node in nodes" :key="node.nodeId" :label="node.displayName || node.k8sNodeName" :value="node.nodeId" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert :title="mode === 'heat' ? '按热度、存储容量和计算节点邻近度整理全部已激活数据集；跳过正在被任务或调度占用的数据。' : '仅准备所选数据，优先放到目标计算存储节点；目标为纯计算节点或容量不足时选择邻近存储节点。复用已有副本，新增副本只复制，不删除源文件。'" type="info" :closable="false" show-icon />
      <p v-if="mode === 'heat'">热度排名前半的数据集会在容量允许时补充实际备份，已有副本会保留。请核对下面的复制、迁移清单。</p>
      <p>两种功能可同时使用；只处理数据，不启动计算任务。同一数据集被占用时请等待结束后重试。</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <template v-if="preview">
        <p>检查 {{ preview.datasetCount }} 个数据集，计划执行 {{ preview.assignments.length }} 项操作。</p>
        <el-table :data="preview.placements" max-height="320">
          <el-table-column prop="datasetName" label="数据集" min-width="180" show-overflow-tooltip />
          <el-table-column label="热度" width="90"><template slot-scope="scope">{{ formatHeat(scope.row.dataHeat) }}</template></el-table-column>
          <el-table-column prop="sourceNode" label="源节点" />
          <el-table-column prop="targetNode" label="目标节点" />
          <el-table-column label="操作" width="100"><template slot-scope="scope">{{ scope.row.action === 'MOVE' ? '迁移数据' : '复制备份' }}</template></el-table-column>
        </el-table>
        <ul v-if="preview.notices.length"><li v-for="(notice, index) in preview.notices" :key="index">{{ notice }}</li></ul>
        <el-alert v-if="preview.assignments.some(item => item.action === 'MOVE')" title="迁移成功后会删除对应源文件；只有目标副本保存成功后才会删除。" type="warning" :closable="false" show-icon />
        <p v-if="!preview.assignments.length">当前没有可执行的复制或迁移，请查看上面的提示。</p>
      </template>
      <el-alert v-if="accepted" :title="`调度计划 #${accepted.planId} 已提交，执行结果请查看调度日志。`" type="success" :closable="false" show-icon />
    </div>
    <span slot="footer">
      <el-button :disabled="submitting" @click="visible = false">关闭</el-button>
      <el-button v-if="!accepted" :disabled="submitting" :loading="loading" @click="load">{{ preview ? '重新预览' : '生成预览' }}</el-button>
      <el-button v-if="accepted" type="primary" @click="viewLogs">查看调度日志</el-button>
      <el-button v-else type="primary" :loading="submitting" :disabled="loading || !preview || !preview.assignments.length" @click="submit">确认执行</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { previewDatasetStorage, submitDatasetStorage } from '@/api/datasetStorageApi'
import { requestId, fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { formatHeat, fetchAllPages } from '@/utils/dataset-catalog'

export default {
  name: 'StoragePlanDialog',
  data() {
    return { visible: false, mode: 'heat', datasetIds: [], targetNodeId: null, datasets: [], nodes: [], loading: false, submitting: false, preview: null, error: '', accepted: null, pending: null, version: 0 }
  },
  computed: { title() { return `${this.mode === 'heat' ? '热敏存储' : '原位汇聚'} · 分配预览` } },
  beforeDestroy() { this.version++ },
  methods: {
    formatHeat,
    async open(mode) {
      this.mode = mode
      this.visible = true
      this.accepted = null
      this.datasetIds = []
      this.targetNodeId = null
      this.invalidatePreview()
      if (mode === 'heat') return this.load()
      const version = ++this.version
      this.loading = true
      try {
        const [datasets, nodes] = await Promise.all([
          fetchAllPages(params => fetchRegisteredDatasets({ ...params, status: 'ACTIVE' })),
          fetchAllPages(fetchRegisteredNodes)
        ])
        if (version !== this.version) return
        this.datasets = datasets.filter(dataset => dataset.status === 'ACTIVE')
        this.nodes = nodes.filter(node => node.schedulable && ['COMPUTE', 'COMPUTE_STORAGE'].includes(node.role))
      } catch (error) {
        if (version === this.version) this.error = `汇聚资源加载失败：${error.message}`
      } finally {
        if (version === this.version) this.loading = false
      }
    },
    invalidatePreview() {
      this.version++
      this.preview = null
      this.pending = null
      this.error = ''
    },
    async load() {
      if (this.submitting) return
      if (this.mode === 'aggregation' && (!this.datasetIds.length || !this.targetNodeId)) {
        this.error = '请选择任务所需数据集和目标计算节点'
        return
      }
      const version = ++this.version
      this.loading = true
      this.error = ''
      this.preview = null
      this.pending = null
      try {
        const options = this.mode === 'aggregation' ? { datasetIds: [...this.datasetIds], targetNodeId: this.targetNodeId } : {}
        const preview = await previewDatasetStorage(this.mode, options)
        if (version !== this.version) return
        this.preview = preview
        this.pending = { mode: this.mode, ...options, externalPlanId: `storage-${requestId()}`, assignments: preview.assignments }
      } catch (error) {
        if (version === this.version) this.error = `分配预览失败：${error.message}`
      } finally {
        if (version === this.version) this.loading = false
      }
    },
    async submit() {
      if (this.loading || this.submitting || this.accepted || !this.pending || !this.pending.assignments.length) return
      this.submitting = true
      this.error = ''
      try {
        await this.$confirm(`将执行 ${this.pending.assignments.length} 项数据操作。${this.pending.assignments.some(item => item.action === 'MOVE') ? '迁移项完成后会删除对应源文件。' : '复制保留源文件。'}是否继续？`, '确认批量数据调度', { type: 'warning', confirmButtonText: '确认执行', cancelButtonText: '取消' })
        this.accepted = await submitDatasetStorage(this.pending)
        this.$emit('submitted', this.accepted)
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.error = `提交失败：${error.message || error}`
      } finally {
        this.submitting = false
      }
    },
    viewLogs() {
      this.visible = false
      this.$router.push('/ManagementCenter/SchedulingLogs')
    }
  }
}
</script>
