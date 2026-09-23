<template>
  <el-container class="security-page">
    <el-main>
      <section class="content-card">
        <h2>异常访问日志</h2>
        <el-alert v-if="activeTab !== 'abnormal'" title="这里只执行功能并保留原始证据；是否满足验收标准由人工 judge。" type="info" :closable="false" show-icon />

        <el-tabs v-model="activeTab">
          <el-tab-pane label="异常访问记录" name="abnormal">
            <div class="toolbar">
              <span>被拒绝的数据集访问请求，主要是域用户跨域访问权限外的数据集；显示最近 {{ abnormal.limit }} 条。</span>
              <el-button icon="el-icon-refresh" :loading="abnormal.loading" @click="loadAbnormalEvents">刷新</el-button>
            </div>
            <el-alert v-if="abnormal.error" :title="abnormal.error" type="error" :closable="false" show-icon class="toolbar-alert" />
            <el-table v-loading="abnormal.loading" :data="abnormal.events" :empty-text="abnormal.error ? '异常访问记录加载失败' : '暂无异常访问记录'" size="small" border>
              <el-table-column label="时间" min-width="160"><template slot-scope="s">{{ formatEventTime(s.row.createdAt) }}</template></el-table-column>
              <el-table-column label="用户" min-width="120"><template slot-scope="s">{{ s.row.principal || '—' }}</template></el-table-column>
              <el-table-column label="数据集" min-width="170" show-overflow-tooltip><template slot-scope="s">{{ datasetLabel(s.row.datasetId) }}</template></el-table-column>
              <el-table-column label="动作" width="110"><template slot-scope="s">{{ actionLabel(s.row.action) }}</template></el-table-column>
              <el-table-column label="原因" min-width="200" show-overflow-tooltip><template slot-scope="s">{{ reasonLabel(s.row.reason) }}</template></el-table-column>
              <el-table-column label="请求 ID" min-width="200" show-overflow-tooltip><template slot-scope="s">{{ s.row.requestId || '—' }}</template></el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="文件强校验" name="integrity">
            <el-form label-width="120px" class="validation-form">
              <el-form-item label="数据集">
                <el-select v-model="integrity.datasetId" filterable style="width:100%" placeholder="选择已注册数据集">
                  <el-option v-for="item in datasets" :key="item.datasetId" :value="item.datasetId" :label="`${item.name} #${item.datasetId} · ${item.version}`" />
                </el-select>
              </el-form-item>
              <el-form-item><el-button type="primary" :loading="integrity.running" :disabled="!integrity.datasetId" @click="runIntegrity">逐字节计算 SHA-256 并核对</el-button></el-form-item>
            </el-form>
            <el-alert v-if="integrity.message" :title="integrity.message" :type="integrity.error ? 'error' : 'success'" :closable="false" show-icon />
            <el-table v-if="integrity.result" :data="integrity.result.replicas || []" size="small" border>
              <el-table-column prop="replicaId" label="副本" width="90" />
              <el-table-column prop="nodeId" label="节点" width="90" />
              <el-table-column prop="filePath" label="文件路径" min-width="220" show-overflow-tooltip />
              <el-table-column prop="checksumAlgorithm" label="算法" width="100" />
              <el-table-column prop="checksum" label="实际摘要" min-width="220" show-overflow-tooltip />
              <el-table-column prop="verificationMessage" label="校验记录" min-width="180" show-overflow-tooltip />
              <el-table-column prop="effectiveAvailability" label="可用性" width="120" />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="访问控制" name="access">
            <el-form label-width="120px" class="validation-form">
              <el-form-item label="数据集">
                <el-select v-model="access.datasetId" filterable style="width:100%" @change="syncAccessDefaults">
                  <el-option v-for="item in datasets" :key="item.datasetId" :value="item.datasetId" :label="`${item.name} #${item.datasetId}`" />
                </el-select>
              </el-form-item>
              <el-form-item label="动作">
                <el-select v-model="access.action" style="width:100%"><el-option v-for="action in actions" :key="action" :value="action" :label="action" /></el-select>
              </el-form-item>
              <el-form-item label="目标节点"><el-input v-model.trim="access.targetNode" placeholder="令牌绑定的 Kubernetes 节点名" /></el-form-item>
              <el-form-item label="文件路径"><el-input v-model.trim="access.path" placeholder="令牌绑定的完整文件路径" /></el-form-item>
              <el-form-item label="测试身份"><el-input v-model.trim="access.username" autocomplete="off" /></el-form-item>
              <el-form-item label="访问密钥"><el-input v-model="access.password" type="password" show-password autocomplete="new-password" /></el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="access.running" :disabled="!canAuthorize" @click="runAuthorization">申请短期限定令牌</el-button>
                <el-button :loading="access.loadingEvents" @click="loadAccessEvents">刷新允许/拒绝事件</el-button>
              </el-form-item>
            </el-form>
            <el-alert v-if="access.message" :title="access.message" :type="access.error ? 'error' : 'success'" :closable="false" show-icon />
            <el-descriptions v-if="access.authorization" title="签发结果" :column="2" border>
              <el-descriptions-item label="认证主体">{{ access.authorization.principal }}</el-descriptions-item>
              <el-descriptions-item label="到期时间">{{ formatEventTime(access.authorization.expiresAt) }}</el-descriptions-item>
              <el-descriptions-item label="令牌 ID">{{ access.authorization.jti }}</el-descriptions-item>
              <el-descriptions-item label="令牌范围">{{ scopeText(access.authorization.scope) }}</el-descriptions-item>
            </el-descriptions>
            <el-table :data="access.events" size="small" max-height="320" border>
              <el-table-column label="时间" min-width="170"><template slot-scope="s">{{ formatEventTime(s.row.createdAt) }}</template></el-table-column>
              <el-table-column prop="principal" label="主体" width="120" />
              <el-table-column prop="action" label="动作" width="85" />
              <el-table-column prop="datasetId" label="数据集" width="100" />
              <el-table-column prop="targetNode" label="目标节点" min-width="120" />
              <el-table-column prop="decision" label="决策" width="100"><template slot-scope="s"><el-tag :type="s.row.decision === 'ALLOWED' ? 'success' : 'danger'">{{ s.row.decision }}</el-tag></template></el-table-column>
              <el-table-column prop="reason" label="原因" min-width="160" />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="MP-SPDZ 安全求和（兼容）" name="aggregation">
            <p class="hint">该旧入口由后端兼容映射到 <code>secure-sum-3p-v1</code>，使用固定 A/B/C 的诚实多数三方恶意安全协议。MP-SPDZ 用于协议功能验收和比较，不代表生产安全认证；是否满足验收仍由人工 judge。</p>
            <el-form label-width="120px" class="validation-form">
              <el-form-item>
                <el-button type="primary" :loading="aggregation.running" @click="runAggregation">启动 MP-SPDZ 三方整数求和</el-button>
                <el-button :disabled="!aggregation.result" @click="loadAggregation">刷新本轮证据</el-button>
              </el-form-item>
            </el-form>
            <el-alert v-if="aggregation.message" :title="aggregation.message" :type="aggregation.error ? 'error' : 'success'" :closable="false" show-icon class="result-alert" />
            <el-descriptions v-if="aggregation.result" :column="3" border>
              <el-descriptions-item label="运行 ID">{{ aggregation.result.runId }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ aggregation.result.status }}</el-descriptions-item>
              <el-descriptions-item label="最终聚合值">{{ aggregation.result.finalValue == null ? '—' : aggregation.result.finalValue }}</el-descriptions-item>
              <el-descriptions-item label="协议">{{ aggregation.result.protocolVersion }}</el-descriptions-item>
              <el-descriptions-item label="参与方">{{ aggregation.result.participantsJson }}</el-descriptions-item>
              <el-descriptions-item label="失败原因">{{ aggregation.result.failureReason || '—' }}</el-descriptions-item>
            </el-descriptions>
            <el-table v-if="aggregation.events.length" :data="aggregation.events" size="small" max-height="340" border class="events-table">
              <el-table-column label="时间" min-width="170"><template slot-scope="s">{{ formatEventTime(s.row.createdAt) }}</template></el-table-column>
              <el-table-column prop="participantId" label="参与方" width="85" />
              <el-table-column prop="direction" label="方向" width="100" />
              <el-table-column prop="messageType" label="消息类型" min-width="180" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column prop="payloadBytes" label="负载字节" width="100" />
              <el-table-column prop="errorCode" label="错误码" min-width="150" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </section>
    </el-main>
  </el-container>
</template>

<script>
import { fetchRegisteredDatasets, fetchRegisteredNodes, verifyDataset } from '@/api/registrationApi'
import { fetchAllPages } from '@/utils/dataset-catalog'
import { parseTime } from '@/utils'
import {
  authorizeDatasetAccess,
  fetchDatasetAccessAuditEvents,
  startSecureAggregation,
  fetchSecureAggregationRun,
  fetchSecureAggregationEvents
} from '@/api/securityValidationApi'

const ACTION_LABELS = { TASK_CREATE: '创建任务' }
const REASON_LABELS = { CROSS_DOMAIN_ACCESS_DENIED: '跨域访问权限外数据集' }

// 审计时间由后端以 UTC 写入（UTC_TIMESTAMP，JVM 时区为 UTC），序列化时不带时区后缀；
// 统一按 UTC 解析后以浏览器本地时间显示。已带 Z/偏移量的时间按原值解析。
const parseServerTime = value => {
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value
    return Date.UTC(year, month - 1, day, hour, minute, second, Math.floor(nano / 1e6))
  }
  if (typeof value === 'number') return value
  const text = String(value).trim().replace(' ', 'T')
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`)
}

export default {
  name: 'SecurityValidation',
  data() {
    return {
      activeTab: 'abnormal',
      datasets: [],
      nodes: [],
      actions: ['READ', 'VERIFY'],
      abnormal: { loading: false, events: [], error: '', limit: 100 },
      integrity: { datasetId: null, running: false, result: null, message: '', error: false },
      access: { datasetId: null, action: 'READ', targetNode: '', path: '', username: '', password: '', running: false, loadingEvents: false, authorization: null, events: [], message: '', error: false },
      aggregation: { running: false, result: null, events: [], message: '', error: false }
    }
  },
  computed: {
    selectedDataset() { return this.datasets.find(item => item.datasetId === this.access.datasetId) },
    canAuthorize() { return this.access.datasetId && this.access.path && this.access.targetNode && this.access.username && this.access.password }
  },
  async created() {
    this.loadAbnormalEvents()
    try {
      const [datasets, nodes] = await Promise.all([
        fetchAllPages(fetchRegisteredDatasets),
        fetchAllPages(fetchRegisteredNodes)
      ])
      this.datasets = datasets
      this.nodes = nodes
      const first = this.datasets[0]
      if (first) {
        this.integrity.datasetId = first.datasetId
        this.access.datasetId = first.datasetId
        this.syncAccessDefaults()
      }
      await this.loadAccessEvents()
    } catch (error) {
      this.integrity.message = `验收资源加载失败：${error.message}`
      this.integrity.error = true
    }
  },
  beforeDestroy() {
    this.access.password = ''
  },
  methods: {
    formatEventTime(value) {
      if (value == null || value === '') return '—'
      const time = parseServerTime(value)
      return Number.isFinite(time) ? parseTime(new Date(time)) : String(value)
    },
    datasetLabel(datasetId) {
      if (datasetId == null || datasetId === '') return '—'
      const dataset = this.datasets.find(item => String(item.datasetId) === String(datasetId))
      return dataset && dataset.name ? `${dataset.name} #${datasetId}` : String(datasetId)
    },
    actionLabel(action) { return ACTION_LABELS[action] || action || '—' },
    reasonLabel(reason) { return REASON_LABELS[reason] || reason || '—' },
    async loadAbnormalEvents() {
      this.abnormal.loading = true
      try {
        const result = await fetchDatasetAccessAuditEvents({ decision: 'DENIED', limit: this.abnormal.limit })
        const events = Array.isArray(result) ? result : ((result && result.list) || [])
        // 兼容尚未支持 decision 过滤的后端：页面只展示被拒绝的事件。
        this.abnormal.events = events.filter(event => !event.decision || event.decision === 'DENIED')
        this.abnormal.error = ''
      } catch (error) {
        this.abnormal.error = `异常访问记录加载失败：${error.message}`
      } finally {
        this.abnormal.loading = false
      }
    },
    scopeText(scope) { return scope ? `${scope.action} ${scope.datasetId}@${scope.datasetVersion} · ${scope.targetNode} · ${scope.path}` : '—' },
    syncAccessDefaults() {
      const dataset = this.selectedDataset
      const replica = dataset && (dataset.replicas || []).find(item =>
        item.effectiveAvailability === 'USABLE' ||
        (!item.effectiveAvailability && item.availability === 'AVAILABLE'))
      if (dataset && replica) {
        const node = this.nodes.find(item => String(item.nodeId) === String(replica.nodeId))
        this.access.path = replica.filePath || ''
        this.access.targetNode = node ? node.k8sNodeName : ''
      }
    },
    async runIntegrity() {
      this.integrity.running = true
      this.integrity.message = ''
      try {
        this.integrity.result = await verifyDataset(this.integrity.datasetId)
        this.integrity.error = false
        this.integrity.message = '强校验已完成；下表保留每个副本的实际 SHA-256 与可用状态。'
      } catch (error) {
        this.integrity.error = true
        this.integrity.message = `强校验失败：${error.message}`
      } finally { this.integrity.running = false }
    },
    accessScope() {
      const dataset = this.selectedDataset || {}
      return { datasetId: String(this.access.datasetId), datasetVersion: dataset.version || 'v1', path: this.access.path, action: this.access.action, targetNode: this.access.targetNode }
    },
    async runAuthorization() {
      this.access.running = true
      this.access.message = ''
      const requestId = `access-${Date.now()}`
      try {
        this.access.authorization = await authorizeDatasetAccess(this.accessScope(), this.access, { requestId, runId: `manual-${new Date().toISOString().slice(0, 10)}` })
        this.access.error = false
        this.access.message = '身份和权限均已验证，短期限定令牌签发成功。'
      } catch (error) {
        this.access.authorization = null
        this.access.error = true
        this.access.message = `请求被拒绝：${error.errorCode || error.message}`
      } finally {
        this.access.password = ''
        this.access.running = false
        await this.loadAccessEvents().catch(() => {})
      }
    },
    async loadAccessEvents() {
      this.access.loadingEvents = true
      try {
        this.access.events = await fetchDatasetAccessAuditEvents({ limit: 100 })
      } finally {
        this.access.loadingEvents = false
      }
    },
    async runAggregation() {
      this.aggregation.running = true
      this.aggregation.message = ''
      try {
        this.aggregation.result = await startSecureAggregation(`aggregate-${Date.now()}`)
        await this.loadAggregation()
      } catch (error) {
        this.aggregation.error = true
        this.aggregation.message = `聚合启动失败：${error.message}`
      } finally { this.aggregation.running = false }
    },
    async loadAggregation() {
      if (!this.aggregation.result) return
      const runId = this.aggregation.result.runId
      const [result, events] = await Promise.all([fetchSecureAggregationRun(runId), fetchSecureAggregationEvents(runId)])
      this.aggregation.result = result
      this.aggregation.events = events
      this.aggregation.error = result.status !== 'COMPLETED'
      this.aggregation.message = result.status === 'COMPLETED' ? 'MP-SPDZ 三方任务已完成，已保留结果与交换证据。' : `本轮状态：${result.status}${result.failureReason ? `；${result.failureReason}` : ''}`
    }
  }
}
</script>

<style scoped>
.security-page { min-height: calc(100vh - 90px); background: #f5f7fa; }
.content-card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, .04); }
h2 { margin: 0 0 18px; color: #253747; }
.el-tabs { margin-top: 18px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.toolbar span { color: #697986; font-size: 13px; }
.toolbar-alert { margin-bottom: 14px; }
.validation-form { max-width: 760px; margin-top: 18px; }
.hint { color: #697986; line-height: 1.7; }
.result-alert, .events-table { margin-top: 16px; }
</style>
