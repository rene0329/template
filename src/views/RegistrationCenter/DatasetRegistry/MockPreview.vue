<template>
  <div class="dataset-preview">
    <header class="preview-header">
      <div>
        <div class="eyebrow">RESOURCE REGISTRY / V1</div>
        <h1>数据集资源</h1>
        <p>从逻辑数据集到节点副本，一处查看版本、资源需求与可用性。</p>
      </div>
      <div class="header-status">
        <el-tag size="small" type="warning" effect="plain">MOCK · 只读预览</el-tag>
        <span v-if="updatedAt"><i class="el-icon-time" /> {{ updatedAt }}</span>
      </div>
    </header>

    <div class="contract-note"><code>GET /api/v1/datasets</code><span>本地模拟响应，不连接真实后端；点击数据行查看节点副本。</span></div>

    <section class="dataset-list">
      <div class="list-toolbar">
        <div class="list-title">数据集目录 <span>{{ total }} 项</span></div>
        <div class="filters">
          <el-input v-model="query" size="small" clearable placeholder="搜索名称 / 编码" prefix-icon="el-icon-search" @keyup.enter.native="search" @clear="search" />
          <el-select v-model="status" size="small" placeholder="全部注册状态" clearable @change="search">
            <el-option label="已激活" value="ACTIVE" />
            <el-option label="已停用" value="DISABLED" />
          </el-select>
          <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <el-table v-loading="loading" :data="rows" row-key="datasetId" :row-class-name="rowClass" @row-click="selectDataset">
        <el-table-column label="数据集 / 编码" min-width="220">
          <template slot-scope="s"><div class="dataset-name">{{ s.row.name }}</div><div class="secondary">{{ s.row.datasetCode }}</div></template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="85" />
        <el-table-column prop="dataType" label="类型" width="70" />
        <el-table-column label="注册状态" width="95">
          <template slot-scope="s"><el-tag size="mini" :type="s.row.status === 'ACTIVE' ? 'success' : 'info'">{{ s.row.status === 'ACTIVE' ? '已激活' : '已停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="副本健康" width="105">
          <template slot-scope="s"><el-tag size="mini" :type="healthType(s.row.healthStatus)">{{ healthLabel(s.row.healthStatus) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="可用副本" width="95">
          <template slot-scope="s">{{ s.row.availableReplicaCount }} / {{ s.row.totalReplicaCount }}</template>
        </el-table-column>
        <el-table-column label="资源需求" min-width="190">
          <template slot-scope="s"><span class="secondary">{{ resourceText(s.row.requiredResources) }}</span></template>
        </el-table-column>
      </el-table>
      <el-pagination :current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="changePage" />
    </section>

    <section v-if="selected" class="dataset-detail">
      <div class="detail-heading"><h2>{{ selected.name }} <span>v{{ selected.version }}</span></h2><span class="secondary">Dataset ID {{ selected.datasetId }}</span></div>
      <p class="description">{{ selected.description }}</p>
      <div class="metadata">
        <div><span>资源需求</span><strong>{{ resourceText(selected.requiredResources) }}</strong></div>
        <div><span>默认镜像 ID</span><strong>{{ selected.defaultRuntimeImageId || '未设置' }}</strong></div>
        <div><span>副本占用合计</span><strong>{{ formatBytes(replicaBytes) }}</strong></div>
        <div><span>记录版本</span><strong>{{ selected.rowVersion }}</strong></div>
      </div>
      <div class="labels"><el-tag v-for="(value, key) in selected.labels" :key="key" size="small" type="info" effect="plain">{{ key }}: {{ value }}</el-tag></div>
      <el-alert v-if="selected.statusReason" :title="selected.statusReason" :type="selected.availableReplicaCount ? 'warning' : 'error'" :closable="false" show-icon />
      <div class="replica-heading"><h3>节点副本</h3><span>可用 {{ selected.availableReplicaCount }} / 共 {{ selected.totalReplicaCount }}</span></div>
      <div class="replica-grid">
        <article v-for="replica in selected.replicas" :key="replica.replicaId" class="replica-card">
          <div class="replica-title"><span><svg-icon icon-class="server" /> 节点 {{ replica.nodeId }}</span><el-tag size="mini" :type="replica.effectiveAvailability === 'USABLE' ? 'success' : 'danger'">{{ replicaLabel(replica.effectiveAvailability) }}</el-tag></div>
          <div class="file-path">{{ replica.filePath }}</div>
          <dl>
            <div><dt>副本 ID</dt><dd>{{ replica.replicaId }}</dd></div>
            <div><dt>文件大小</dt><dd>{{ formatBytes(replica.sizeBytes) }}</dd></div>
            <div><dt>文件状态</dt><dd>{{ replica.availability }}</dd></div>
            <div><dt>最近校验</dt><dd>{{ formatTime(replica.verifiedAt) }}</dd></div>
            <div><dt>校验和</dt><dd>{{ replica.checksum || '未提供' }}</dd></div>
          </dl>
          <p v-if="replica.statusReason" class="replica-reason">{{ replica.statusReason }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import { fetchRegisteredDatasets } from '@/api/registrationApi'

export default {
  name: 'DatasetMockPreview',
  data() {
    return { query: '', status: '', page: 1, pageSize: 5, total: 0, rows: [], selected: null, loading: false, error: '', updatedAt: '' }
  },
  computed: {
    replicaBytes() {
      return this.selected.replicas.reduce((sum, replica) => sum + (replica.availability === 'AVAILABLE' ? replica.sizeBytes || 0 : 0), 0)
    }
  },
  created() { this.load() },
  methods: {
    async load() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        const result = await fetchRegisteredDatasets({ page: this.page, pageSize: this.pageSize, query: this.query, status: this.status || undefined })
        this.rows = result.list
        this.total = result.total
        this.selected = this.rows.find(row => this.selected && row.datasetId === this.selected.datasetId) || this.rows[0] || null
        this.updatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      } catch (error) {
        this.error = '模拟数据加载失败，请点击刷新重试。'
      } finally {
        this.loading = false
      }
    },
    search() { this.page = 1; this.load() },
    changePage(page) { this.page = page; this.load() },
    selectDataset(row) { this.selected = row },
    rowClass({ row }) { return this.selected && row.datasetId === this.selected.datasetId ? 'selected-dataset' : '' },
    healthType(value) { return { HEALTHY: 'success', DEGRADED: 'warning', UNAVAILABLE: 'danger' }[value] || 'info' },
    healthLabel(value) { return { HEALTHY: '健康', DEGRADED: '部分可用', UNAVAILABLE: '不可用' }[value] || value },
    replicaLabel(value) { return { USABLE: '可用', UNREACHABLE: '节点不可达', MISSING: '文件缺失' }[value] || value },
    resourceText(resources = {}) { return `${resources.cpu || 0} CPU · ${resources.memoryGi || 0} GiB · ${resources.gpu || 0} GPU` },
    formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未校验' },
    formatBytes(value) { return value >= 1073741824 ? `${(value / 1073741824).toFixed(1)} GiB` : `${(value / 1048576).toFixed(0)} MiB` }
  }
}
</script>

<style lang="scss" scoped>
.dataset-preview { padding: 28px; background: #f5f7fb; min-height: calc(100vh - 50px); color: #24344b; }
.preview-header, .detail-heading, .list-toolbar, .filters, .replica-title, .replica-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.eyebrow { color: #527497; font-size: 11px; font-weight: 600; letter-spacing: 2px; }
h1 { margin: 10px 0; font-size: 27px; font-weight: 600; }
.preview-header p, .description { color: #738096; font-size: 13px; line-height: 1.7; }
.header-status { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; font-size: 12px; color: #738096; }
.contract-note { display: flex; flex-wrap: wrap; gap: 14px; margin: 12px 0 20px; font-size: 12px; color: #738096; }
.contract-note code { color: #3c709c; }
.dataset-list, .dataset-detail { background: #fff; border: 1px solid #e7ecf2; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
.list-toolbar { margin-bottom: 16px; flex-wrap: wrap; }
.list-title { font-weight: 600; }
.list-title span { margin-left: 10px; color: #8491a4; font-size: 12px; font-weight: 400; }
.filters { flex-wrap: wrap; }
.filters .el-input { width: 220px; }
.filters .el-select { width: 150px; }
.dataset-name { font-weight: 600; color: #30445f; }
.secondary { font-size: 12px; color: #8190a4; }
.el-pagination { margin-top: 16px; text-align: right; }
::v-deep .el-table__row { cursor: pointer; }
::v-deep .selected-dataset td { background: #edf5ff !important; }
h2 { font-size: 18px; margin: 0; }
h2 span { font-size: 13px; color: #738096; font-weight: 400; margin-left: 8px; }
.metadata { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 20px; padding: 16px; background: #f7f9fc; border-radius: 6px; }
.metadata span, .metadata strong { display: block; font-size: 12px; }
.metadata span { color: #8491a4; margin-bottom: 8px; }
.metadata strong { font-weight: 500; }
.labels { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.replica-heading h3 { font-size: 14px; }
.replica-heading > span { font-size: 12px; color: #738096; }
.replica-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 14px; }
.replica-card { border: 1px solid #e7ecf2; border-radius: 8px; padding: 16px; min-width: 0; }
.replica-title { font-size: 13px; font-weight: 600; }
.replica-title .svg-icon { color: #4e87c0; margin-right: 5px; }
.file-path { font-family: monospace; overflow-wrap: anywhere; color: #738096; font-size: 11px; line-height: 1.6; margin: 12px 0; }
dl { font-size: 11px; margin-bottom: 0; }
dl > div { display: flex; justify-content: space-between; gap: 8px; margin-top: 9px; }
dt { color: #8491a4; flex-shrink: 0; }
dd { margin: 0; overflow-wrap: anywhere; text-align: right; }
.replica-reason { color: #cf655a; font-size: 12px; line-height: 1.5; margin-bottom: 0; }
@media (max-width: 900px) {
  .dataset-preview { padding: 16px; }
  .metadata { grid-template-columns: 1fr 1fr; }
  .preview-header { align-items: flex-start; }
}
</style>
