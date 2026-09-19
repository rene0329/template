<template>
  <el-dialog title="访问性能对照" :visible.sync="visible" width="920px" :close-on-click-modal="false">
    <el-alert title="以同一完整文件和消费节点重复读取。结果只记录原始数据，是否达到验收要求由人工判断。" type="info" :closable="false" show-icon />
    <el-form label-width="120px" class="access-form">
      <el-form-item label="数据集">{{ dataset.name }} #{{ dataset.datasetId }}</el-form-item>
      <el-form-item label="消费计算节点">
        <el-select v-model="form.consumerNodeId" filterable style="width:100%" placeholder="选择实际读取端">
          <el-option v-for="node in computeNodes" :key="node.nodeId" :value="node.nodeId" :label="node.displayName || node.k8sNodeName" />
        </el-select>
      </el-form-item>
      <el-form-item label="验收运行 ID"><el-input v-model.trim="form.runId" maxlength="128" /></el-form-item>
      <el-form-item label="测试身份"><el-input v-model.trim="credentials.username" autocomplete="off" /></el-form-item>
      <el-form-item label="访问密钥"><el-input v-model="credentials.password" type="password" show-password autocomplete="new-password" /></el-form-item>
      <el-form-item><el-checkbox v-model="form.clearCache">本次读取前清除该数据版本缓存</el-checkbox></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-table v-if="events.length" :data="events" max-height="300" size="small">
      <el-table-column prop="requestId" label="请求 ID" min-width="185" show-overflow-tooltip />
      <el-table-column prop="cacheLayer" label="读取层" width="120" />
      <el-table-column label="来源" width="120"><template slot-scope="s">节点 #{{ s.row.sourceNodeId }}</template></el-table-column>
      <el-table-column label="首字节" width="100"><template slot-scope="s">{{ firstByte(s.row) }}</template></el-table-column>
      <el-table-column label="完整耗时" width="100"><template slot-scope="s">{{ duration(s.row) }}</template></el-table-column>
      <el-table-column label="吞吐量" width="110"><template slot-scope="s">{{ throughput(s.row) }}</template></el-table-column>
      <el-table-column label="结果" width="90"><template slot-scope="s"><el-tag :type="s.row.success ? 'success' : 'danger'">{{ s.row.success ? '完整' : '失败' }}</el-tag></template></el-table-column>
    </el-table>
    <span slot="footer">
      <el-button @click="visible=false">关闭</el-button>
      <el-button :loading="loading" @click="loadEvents">刷新记录</el-button>
      <el-button type="primary" :loading="running" :disabled="!canRun" @click="run">开始完整读取</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { fetchRegisteredNodes } from '@/api/registrationApi'
import { runDatasetAccessTest, fetchDatasetAccessEvents } from '@/api/datasetAccessApi'
import { fetchAllPages } from '@/utils/dataset-catalog'

export default {
  name: 'AccessTestDialog',
  data() {
    return {
      visible: false, loading: false, running: false, error: '', dataset: {}, nodes: [], events: [],
      form: { consumerNodeId: null, runId: '', clearCache: true },
      credentials: { username: '', password: '' }
    }
  },
  computed: {
    computeNodes() { return this.nodes.filter(node => node.schedulable && ['COMPUTE', 'COMPUTE_STORAGE'].includes(node.role)) },
    canRun() { return this.form.consumerNodeId && this.form.runId && this.credentials.username && this.credentials.password }
  },
  methods: {
    async open(dataset) {
      this.dataset = dataset
      this.visible = true
      this.error = ''
      this.events = []
      this.form = { consumerNodeId: null, runId: `acceptance-${new Date().toISOString().slice(0, 10)}`, clearCache: true }
      this.credentials = { username: '', password: '' }
      this.loading = true
      try {
        this.nodes = await fetchAllPages(fetchRegisteredNodes, { silent: true })
        const local = (dataset.replicas || []).find(replica => this.computeNodes.some(node => node.nodeId === replica.nodeId))
        this.form.consumerNodeId = local ? local.nodeId : (this.computeNodes[0] || {}).nodeId || null
        await this.loadEvents()
      } catch (error) {
        this.error = `读取测试资源加载失败：${error.message}`
      } finally { this.loading = false }
    },
    async run() {
      if (!this.canRun || this.running) return
      this.running = true
      this.error = ''
      const requestId = `read-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const credentials = { ...this.credentials }
      try {
        await runDatasetAccessTest(this.dataset.datasetId, { ...this.form, requestId }, credentials)
        this.credentials.password = ''
        await this.loadEvents()
        this.$message.success('完整读取已完成，原始记录已保存')
        this.$emit('completed')
      } catch (error) {
        this.error = `读取失败：${error.message}`
        await this.loadEvents().catch(() => {})
      } finally { this.running = false }
    },
    async loadEvents() {
      if (!this.dataset.datasetId) return
      this.events = await fetchDatasetAccessEvents({ datasetId: this.dataset.datasetId, runId: this.form.runId || undefined, limit: 50 })
    },
    firstByte(row) {
      if (!row.startedAt || !row.firstByteAt) return '—'
      return `${Math.max(0, new Date(row.firstByteAt) - new Date(row.startedAt))} ms`
    },
    duration(row) { return row.durationMs == null ? '—' : `${row.durationMs} ms` },
    throughput(row) {
      if (!row.success || !row.durationMs || !row.bytesRead) return '—'
      return `${(row.bytesRead / 1024 / 1024 / (row.durationMs / 1000)).toFixed(2)} MB/s`
    }
  }
}
</script>

<style scoped>
.access-form { margin-top: 18px; }
</style>
