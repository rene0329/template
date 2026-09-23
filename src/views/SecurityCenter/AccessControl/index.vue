<template>
  <el-container class="access-page">
    <el-main>
      <section class="page-heading">
        <div>
          <h2>访问控制</h2>
          <p>数据集的所属域由其当前存放的节点决定。存放在本域节点上的数据集可直接使用；其他数据集需填写申请说明，申请临时访问令牌<span v-if="ttlMinutes">（有效期 {{ ttlMinutes }} 分钟）</span>，到期后自动失效。</p>
        </div>
        <el-button icon="el-icon-refresh" :loading="loading" @click="load()">刷新</el-button>
      </section>

      <section class="content-card">
        <div class="toolbar">
          <span>共 {{ items.length }} 个数据集，当前可用 {{ accessibleCount }} 个</span>
          <el-input v-model="query" clearable prefix-icon="el-icon-search" placeholder="搜索名称、编码、版本或所属域" class="search" />
        </div>
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon class="load-error" />
        <el-table v-loading="loading" :data="rows" :empty-text="emptyText" row-key="datasetId" border>
          <el-table-column label="数据集名称" min-width="180">
            <template slot-scope="s"><strong>{{ datasetName(s.row) }}</strong><div v-if="s.row.status && s.row.status !== 'ACTIVE'" class="muted">数据集状态：{{ s.row.status }}</div></template>
          </el-table-column>
          <el-table-column prop="datasetCode" label="编码" min-width="150" show-overflow-tooltip />
          <el-table-column prop="version" label="版本" width="90" />
          <el-table-column label="所属域" min-width="150"><template slot-scope="s">{{ domainName(s.row) }}</template></el-table-column>
          <el-table-column label="状态" min-width="250">
            <template slot-scope="s">
              <div class="status-cell"><el-tag :type="s.row.access.type" size="small">{{ s.row.access.label }}</el-tag><span>{{ s.row.access.detail }}</span></div>
              <div v-if="s.row.access.expiresAt" class="muted">到期时间 {{ s.row.access.expiresAt }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template slot-scope="s"><el-button v-if="canApply(s.row)" type="primary" size="mini" plain @click="openApply(s.row)">申请令牌</el-button><span v-else class="muted">—</span></template>
          </el-table-column>
        </el-table>
      </section>

      <el-dialog title="申请临时访问令牌" :visible.sync="apply.visible" width="540px" :close-on-click-modal="false">
        <el-descriptions v-if="apply.dataset" :column="1" size="small" border>
          <el-descriptions-item label="数据集">{{ datasetName(apply.dataset) }}</el-descriptions-item>
          <el-descriptions-item label="编码 / 版本">{{ apply.dataset.datasetCode || '—' }} · {{ apply.dataset.version || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所属域">{{ domainName(apply.dataset) }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-position="top" class="apply-form">
          <el-form-item label="申请说明" :error="apply.touched ? reasonError : ''" required>
            <el-input v-model="apply.reason" type="textarea" :rows="4" :maxlength="reasonMax" show-word-limit placeholder="说明需要使用该数据集的任务与用途" />
          </el-form-item>
        </el-form>
        <el-alert :title="validityText" description="令牌到期后该数据集自动恢复为不可用，届时需要重新申请。" type="info" :closable="false" show-icon />
        <span slot="footer"><el-button @click="apply.visible = false">取消</el-button><el-button type="primary" :loading="apply.submitting" @click="submitApply">提交申请</el-button></span>
      </el-dialog>
    </el-main>
  </el-container>
</template>

<script>
import { fetchDatasetAccess, requestDatasetAccessGrant } from '@/api/accessControlApi'
import { parseTime } from '@/utils'

const REASON_MAX = 500
const TICK_MS = 1000
const REFRESH_INTERVAL_MS = 60000
// 到期后稍等片刻再重新拉取，避免与服务端的到期判定擦肩而过。
const EXPIRY_GRACE_MS = 1000
const MAX_TIMEOUT_MS = 2147483647

const BASIS_TEXT = { ADMIN: '管理员', OWN_DOMAIN: '本域数据', GRANT: '临时授权' }
const GRANT_CONFLICTS = {
  DATASET_ALREADY_ACCESSIBLE: '该数据集当前已可用，无需申请',
  GRANT_ALREADY_ACTIVE: '该数据集已有生效中的临时授权'
}

// 服务端时间按 ISO instant 返回；缺少时区后缀时按 UTC 处理（后端统一以 UTC 运行）。
const parseInstant = value => {
  if (value == null || value === '') return NaN
  if (typeof value === 'number') return value
  const text = String(value).trim().replace(' ', 'T')
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`)
}

// 数据集随副本所在节点归属一个或多个业务域；不在任何域节点上时为空。
const domainNamesOf = row => (Array.isArray(row.domainNames) ? row.domainNames : [])
  .filter(name => name != null && String(name).trim() !== '')

export default {
  name: 'AccessControl',
  data() {
    return {
      loading: false,
      error: '',
      query: '',
      items: [],
      ttlMinutes: null,
      clockOffset: 0,
      now: Date.now(),
      loadSeq: 0,
      disposed: false,
      reasonMax: REASON_MAX,
      apply: { visible: false, dataset: null, reason: '', touched: false, submitting: false },
      tickTimer: null,
      refreshTimer: null,
      expiryTimer: null
    }
  },
  computed: {
    rows() {
      const keyword = this.query.trim().toLowerCase()
      const matches = row => [row.name, row.datasetCode, row.version, row.datasetId, ...domainNamesOf(row)]
        .some(value => value != null && String(value).toLowerCase().includes(keyword))
      return this.items
        .filter(row => !keyword || matches(row))
        .map(row => ({ ...row, access: this.statusOf(row) }))
    },
    accessibleCount() { return this.items.filter(row => this.isAccessible(row)).length },
    emptyText() {
      if (this.error && !this.items.length) return '数据集访问权限加载失败'
      return this.query.trim() ? '没有匹配的数据集' : '暂无数据集'
    },
    reasonError() {
      const reason = this.apply.reason.trim()
      if (!reason) return '请填写申请说明'
      if (reason.length > REASON_MAX) return `申请说明不能超过 ${REASON_MAX} 个字符`
      return ''
    },
    validityText() { return `有效期 ${this.ttlMinutes || '—'} 分钟` }
  },
  created() {
    this.load()
    this.startTimers()
  },
  beforeDestroy() {
    this.disposed = true
    this.stopTimers()
  },
  methods: {
    datasetName(row) { return row.name || row.datasetCode || `#${row.datasetId}` },
    domainName(row) { return domainNamesOf(row).join('、') || '—' },
    serverNow() { return this.now + this.clockOffset },
    grantRemainingMs(row) { return parseInstant(row.grantExpiresAt) - this.serverNow() },
    grantExpired(row) { return row.basis === 'GRANT' && this.grantRemainingMs(row) <= 0 },
    // 临时授权到期的瞬间就按不可用展示，不必等待重新拉取完成。
    isAccessible(row) { return Boolean(row.accessible) && !this.grantExpired(row) },
    canApply(row) { return !this.isAccessible(row) },
    remainingText(row) {
      const ms = this.grantRemainingMs(row)
      if (!Number.isFinite(ms)) return '到期时间未知'
      if (ms >= 60000) return `剩余 ${Math.floor(ms / 60000)} 分钟`
      return `剩余 ${Math.max(1, Math.ceil(ms / 1000))} 秒`
    },
    statusOf(row) {
      if (this.isAccessible(row)) {
        if (row.basis !== 'GRANT') return { available: true, label: '可用', type: 'success', detail: BASIS_TEXT[row.basis] || '已授权', expiresAt: '' }
        const expiresAt = parseInstant(row.grantExpiresAt)
        return {
          available: true,
          label: '可用',
          type: 'success',
          detail: `临时授权，${this.remainingText(row)}`,
          expiresAt: Number.isFinite(expiresAt) ? parseTime(new Date(expiresAt)) : ''
        }
      }
      return { available: false, label: '不可用', type: 'info', detail: this.grantExpired(row) ? '临时授权已到期' : '需申请临时令牌', expiresAt: '' }
    },
    async load({ silent = false } = {}) {
      const seq = ++this.loadSeq
      if (!silent) this.loading = true
      try {
        const result = await fetchDatasetAccess({ silent }) || {}
        if (seq !== this.loadSeq || this.disposed) return
        const clientNow = Date.now()
        const serverTime = parseInstant(result.serverTime)
        this.clockOffset = Number.isFinite(serverTime) ? serverTime - clientNow : 0
        this.now = clientNow
        this.ttlMinutes = Number(result.ttlMinutes) || this.ttlMinutes
        this.items = Array.isArray(result.items) ? result.items : []
        this.error = ''
        this.scheduleExpiryRefresh()
      } catch (error) {
        if (seq === this.loadSeq) this.error = `数据集访问权限加载失败：${error.message}`
      } finally {
        if (seq === this.loadSeq) this.loading = false
      }
    },
    startTimers() {
      this.stopTimers()
      this.tickTimer = setInterval(() => { this.now = Date.now() }, TICK_MS)
      this.refreshTimer = setInterval(() => this.load({ silent: true }), REFRESH_INTERVAL_MS)
    },
    stopTimers() {
      clearInterval(this.tickTimer)
      clearInterval(this.refreshTimer)
      clearTimeout(this.expiryTimer)
      this.tickTimer = null
      this.refreshTimer = null
      this.expiryTimer = null
    },
    // 在最早到期的临时授权到期时重新拉取列表，使该行自动恢复为不可用。
    scheduleExpiryRefresh() {
      clearTimeout(this.expiryTimer)
      this.expiryTimer = null
      if (this.disposed) return
      const serverNow = Date.now() + this.clockOffset
      const next = this.items
        .filter(row => row.accessible && row.basis === 'GRANT')
        .map(row => parseInstant(row.grantExpiresAt))
        .filter(expiresAt => Number.isFinite(expiresAt) && expiresAt > serverNow)
        .reduce((earliest, expiresAt) => Math.min(earliest, expiresAt), Infinity)
      if (!Number.isFinite(next)) return
      const delay = Math.min(next - serverNow + EXPIRY_GRACE_MS, MAX_TIMEOUT_MS)
      this.expiryTimer = setTimeout(() => this.load({ silent: true }), delay)
    },
    openApply(row) {
      this.apply = { visible: true, dataset: row, reason: '', touched: false, submitting: false }
    },
    async submitApply() {
      this.apply.touched = true
      if (this.reasonError || this.apply.submitting) return
      const dataset = this.apply.dataset
      this.apply.submitting = true
      try {
        const grant = await requestDatasetAccessGrant(dataset.datasetId, this.apply.reason.trim()) || {}
        this.apply.visible = false
        this.$message.success(`已获得「${this.datasetName(dataset)}」的临时访问令牌，有效期 ${grant.ttlMinutes || this.ttlMinutes} 分钟`)
        await this.load()
      } catch (error) {
        if (error.status === 409 || error.status === 404) {
          this.apply.visible = false
          this.$message.warning(GRANT_CONFLICTS[error.errorCode] || error.message)
          await this.load()
        } else {
          this.$message.error(`申请失败：${error.message}`)
        }
      } finally {
        this.apply.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.access-page { min-height: calc(100vh - 90px); background: #f4f7fa; }
.page-heading, .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.page-heading { margin-bottom: 16px; }.page-heading h2 { margin: 0 0 7px; color: #1f3447; }.page-heading p, .toolbar span, .muted { margin: 0; color: #7b8995; font-size: 13px; }
.content-card { padding: 18px 22px 24px; border-radius: 8px; background: #fff; box-shadow: 0 2px 9px rgba(32,55,76,.06); }
.toolbar { margin-bottom: 16px; }.toolbar .search { width: 300px; margin-left: auto; }
.load-error { margin-bottom: 16px; }
.status-cell { display: flex; align-items: center; gap: 8px; color: #3d5262; }
.apply-form { margin-top: 18px; }
@media(max-width:768px){.page-heading,.toolbar{align-items:stretch;flex-direction:column}.toolbar .search{width:100%;margin-left:0}}
</style>
