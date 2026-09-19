<template>
  <el-container class="security-page">
    <el-main>
      <section class="content-card">
        <div class="title-row">
          <h2>安全与完整性验收</h2>
          <router-link to="/ManagementCenter/PrivacyComputing"><el-button type="primary" plain icon="el-icon-lock">进入隐私协同计算</el-button></router-link>
        </div>
        <el-alert title="这里只执行功能并保留原始证据；是否满足验收标准由人工 judge。" type="info" :closable="false" show-icon />

        <el-tabs v-model="activeTab">
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
              <el-descriptions-item label="到期时间">{{ access.authorization.expiresAt }}</el-descriptions-item>
              <el-descriptions-item label="令牌 ID">{{ access.authorization.jti }}</el-descriptions-item>
              <el-descriptions-item label="令牌范围">{{ scopeText(access.authorization.scope) }}</el-descriptions-item>
            </el-descriptions>
            <el-table :data="access.events" size="small" max-height="320" border>
              <el-table-column prop="createdAt" label="时间" min-width="170" />
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
              <el-form-item label="参与方 A 密钥"><el-input v-model="aggregation.secret" type="password" show-password autocomplete="new-password" placeholder="只保存在当前页面内存" /></el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="aggregation.running" :disabled="!aggregation.secret" @click="runAggregation">启动 MP-SPDZ 三方整数求和</el-button>
                <el-button :disabled="!aggregation.result || !aggregation.secret" @click="loadAggregation">刷新本轮证据</el-button>
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
              <el-table-column prop="createdAt" label="时间" min-width="170" />
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
import {
  authorizeDatasetAccess,
  fetchDatasetAccessAuditEvents,
  startSecureAggregation,
  fetchSecureAggregationRun,
  fetchSecureAggregationEvents
} from '@/api/securityValidationApi'

export default {
  name: 'SecurityValidation',
  data() {
    return {
      activeTab: 'integrity',
      datasets: [],
      nodes: [],
      actions: ['READ', 'VERIFY'],
      integrity: { datasetId: null, running: false, result: null, message: '', error: false },
      access: { datasetId: null, action: 'READ', targetNode: '', path: '', username: '', password: '', running: false, loadingEvents: false, authorization: null, events: [], message: '', error: false },
      aggregation: { secret: '', running: false, result: null, events: [], message: '', error: false }
    }
  },
  computed: {
    selectedDataset() { return this.datasets.find(item => item.datasetId === this.access.datasetId) },
    canAuthorize() { return this.access.datasetId && this.access.path && this.access.targetNode && this.access.username && this.access.password }
  },
  async created() {
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
    this.aggregation.secret = ''
  },
  methods: {
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
        const credentials = { username: 'A', password: this.aggregation.secret }
        this.aggregation.result = await startSecureAggregation(`aggregate-${Date.now()}`, credentials)
        await this.loadAggregation()
      } catch (error) {
        this.aggregation.error = true
        this.aggregation.message = `聚合启动失败：${error.message}`
      } finally { this.aggregation.running = false }
    },
    async loadAggregation() {
      if (!this.aggregation.result) return
      const runId = this.aggregation.result.runId
      const credentials = { username: 'A', password: this.aggregation.secret }
      const [result, events] = await Promise.all([fetchSecureAggregationRun(runId, credentials), fetchSecureAggregationEvents(runId, credentials)])
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
.title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.el-tabs { margin-top: 18px; }
.validation-form { max-width: 760px; margin-top: 18px; }
.hint { color: #697986; line-height: 1.7; }
.result-alert, .events-table { margin-top: 16px; }
</style>
