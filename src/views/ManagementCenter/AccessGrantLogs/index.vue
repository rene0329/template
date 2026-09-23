<!-- 访问申请日志（仅管理员）：用户为权限外数据集申请的短期访问令牌 -->
<template>
  <div class="access-grant-logs-page">
    <section class="content-card">
      <div class="page-heading">
        <div>
          <h2>访问申请日志</h2>
          <p>记录用户为权限外数据集申请的短期访问令牌，令牌到期后自动失效；显示最近 {{ limit }} 条。</p>
        </div>
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="关键词">
          <el-input v-model.trim="filters.query" clearable placeholder="用户 / 数据集 / 申请说明" @input="page = 1" />
        </el-form-item>
        <el-form-item label="令牌状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" @change="page = 1">
            <el-option value="ACTIVE" label="可用" />
            <el-option value="EXPIRED" label="已过期" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert v-if="error" class="error-message" :title="error" type="error" :closable="false" show-icon />
      <el-table v-loading="loading" :data="pageRows" row-key="grantId" :empty-text="error ? '访问申请日志加载失败' : '暂无访问申请记录'">
        <el-table-column label="申请时间" width="170">
          <template slot-scope="scope">{{ formatTime(scope.row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="申请用户" min-width="150" show-overflow-tooltip>
          <template slot-scope="scope">{{ userLabel(scope.row) }}</template>
        </el-table-column>
        <el-table-column label="所属域" min-width="120" show-overflow-tooltip>
          <template slot-scope="scope">{{ scope.row.domainName || '—' }}</template>
        </el-table-column>
        <el-table-column label="数据集" min-width="190" show-overflow-tooltip>
          <template slot-scope="scope">{{ datasetLabel(scope.row) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="申请说明" min-width="200" show-overflow-tooltip />
        <el-table-column label="到期时间" width="170">
          <template slot-scope="scope">{{ formatTime(scope.row.expiresAt) }}</template>
        </el-table-column>
        <el-table-column label="令牌状态" width="170">
          <template slot-scope="scope">
            <el-tag size="small" :type="isActive(scope.row) ? 'success' : 'info'">{{ isActive(scope.row) ? '可用' : '已过期' }}</el-tag>
            <span v-if="isActive(scope.row)" class="remaining">{{ remainingText(scope.row) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredRows.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="changeSize"
          @current-change="changePage"
        />
      </div>
    </section>
  </div>
</template>

<script>
import { fetchAccessGrantLog } from '@/api/accessControlApi'
import { parseTime } from '@/utils'

// 令牌状态随时间变化，定时重新计算，不必重新请求。
const STATUS_TICK_MS = 30 * 1000

export default {
  name: 'AccessGrantLogs',
  data() {
    return {
      limit: 500,
      loading: false,
      error: '',
      rows: [],
      filters: { query: '', status: '' },
      page: 1,
      pageSize: 20,
      // 服务器时间与本机时间之差：令牌是否可用按服务器时间判断，不依赖浏览器时钟。
      clockOffset: 0,
      now: Date.now(),
      timer: null
    }
  },
  computed: {
    filteredRows() {
      const query = this.filters.query.toLowerCase()
      return this.rows.filter(row => {
        if (this.filters.status === 'ACTIVE' && !this.isActive(row)) return false
        if (this.filters.status === 'EXPIRED' && this.isActive(row)) return false
        if (!query) return true
        return [row.username, row.displayName, row.domainName, row.datasetName, row.datasetCode, row.reason]
          .some(value => String(value || '').toLowerCase().includes(query))
      })
    },
    pageRows() {
      const start = (this.page - 1) * this.pageSize
      return this.filteredRows.slice(start, start + this.pageSize)
    }
  },
  created() {
    this.load()
    this.timer = window.setInterval(() => { this.now = Date.now() }, STATUS_TICK_MS)
  },
  beforeDestroy() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const result = await fetchAccessGrantLog(this.limit)
        const serverTime = Date.parse(result && result.serverTime)
        this.now = Date.now()
        this.clockOffset = Number.isFinite(serverTime) ? serverTime - this.now : 0
        this.rows = result && Array.isArray(result.items) ? result.items : []
        this.error = ''
      } catch (error) {
        this.error = `访问申请日志加载失败：${error.message}`
      } finally {
        this.loading = false
      }
    },
    serverNow() {
      return this.now + this.clockOffset
    },
    // 与后端规则一致：到期时间晚于当前服务器时间才可用。
    isActive(row) {
      const expires = Date.parse(row && row.expiresAt)
      return Number.isFinite(expires) && expires > this.serverNow()
    },
    remainingText(row) {
      const minutes = Math.ceil((Date.parse(row.expiresAt) - this.serverNow()) / 60000)
      return `剩余 ${Math.max(minutes, 1)} 分钟`
    },
    formatTime(value) {
      const time = Date.parse(value)
      return Number.isFinite(time) ? parseTime(new Date(time)) : '—'
    },
    userLabel(row) {
      if (!row.username) return row.userId == null ? '—' : `用户 #${row.userId}`
      return row.displayName && row.displayName !== row.username ? `${row.displayName}（${row.username}）` : row.username
    },
    datasetLabel(row) {
      const name = row.datasetName || row.datasetCode || `数据集 #${row.datasetId}`
      const detail = [row.datasetCode, row.datasetVersion].filter(Boolean).join(' · ')
      return detail && detail !== name ? `${name}（${detail}）` : name
    },
    changeSize(size) {
      this.pageSize = size
      this.page = 1
    },
    changePage(page) {
      this.page = page
    }
  }
}
</script>

<style lang="scss" scoped>
.access-grant-logs-page { padding: 20px 24px 0; color: #303133; }
.content-card { background: #fff; border-radius: 8px; padding: 24px; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
.page-heading p { margin: 0; color: #909399; font-size: 13px; }
.el-input { width: 250px; }
.el-select { width: 160px; }
.error-message { margin-bottom: 16px; }
.remaining { margin-left: 8px; color: #909399; font-size: 12px; }
.pagination-container { margin-top: 24px; overflow-x: auto; text-align: right; }
@media (max-width: 900px) {
  .access-grant-logs-page { padding: 12px; }
  .content-card { padding: 16px; }
}
</style>
