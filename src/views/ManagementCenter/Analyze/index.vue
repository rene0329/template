<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <section class="content-card">
        <!-- 历史链接（?runId=）使用的“两个任务 ID 配对”视图；新任务按单个任务 ID 展示，不走这里。 -->
        <div v-if="showRunLookup" class="run-lookup">
          <el-input v-model.trim="runLookup.id" placeholder="验收运行 ID" clearable />
          <el-input-number v-model="runLookup.round" :min="1" controls-position="right" />
          <el-button type="primary" :loading="comparisonLoading" @click="loadComparison">加载实测配对</el-button>
        </div>
        <el-alert v-if="comparisonError" :title="comparisonError" type="warning" :closable="false" show-icon />
        <el-table v-if="comparison" :data="[comparison]" class="comparison-table" border>
          <el-table-column prop="acceptanceRunId" label="验收运行 ID" min-width="160" />
          <el-table-column prop="runRound" label="轮次" width="70" />
          <el-table-column prop="centralizedTaskId" label="集中式任务" width="110">
            <template slot-scope="s"><el-button type="text" :disabled="!s.row.centralizedTaskId" @click="showEvidence(s.row.centralizedTaskId)">#{{ s.row.centralizedTaskId || '—' }}</el-button></template>
          </el-table-column>
          <el-table-column label="集中式 T1" width="120"><template slot-scope="s">{{ rawMs(s.row.centralizedPreparationMs) }}</template></el-table-column>
          <el-table-column prop="inPlaceTaskId" label="方舱式任务" width="110">
            <template slot-scope="s"><el-button type="text" :disabled="!s.row.inPlaceTaskId" @click="showEvidence(s.row.inPlaceTaskId)">#{{ s.row.inPlaceTaskId || '—' }}</el-button></template>
          </el-table-column>
          <el-table-column label="方舱式 T2" width="120"><template slot-scope="s">{{ rawMs(s.row.inPlacePreparationMs) }}</template></el-table-column>
          <el-table-column label="T1/T2" width="100"><template slot-scope="s">{{ s.row.centralizedToInPlaceRatio == null ? '—' : `${s.row.centralizedToInPlaceRatio.toFixed(3)}×` }}</template></el-table-column>
          <el-table-column label="可复算" min-width="180"><template slot-scope="s"><el-tag :type="s.row.comparable ? 'success' : 'warning'">{{ s.row.comparable ? '原始事件完整' : (s.row.reason || '不可比较') }}</el-tag></template></el-table-column>
        </el-table>
        <p v-if="comparison" class="chart-note">页面只展示实测值和可复算状态，不自动判定是否通过 1.2 门槛。</p>
        <div class="toolbar">
          <el-form :inline="true" :model="formInline" size="medium" @submit.native.prevent="onSearch">
            <el-form-item>
              <el-input v-model="formInline.name" clearable placeholder="请输入任务名称" aria-label="搜索任务" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" native-type="submit">搜索</el-button>
              <el-button @click="onCancel">重置</el-button>
            </el-form-item>
          </el-form>
          <div class="toolbar-actions">
            <el-button type="text" @click="showRunLookup = !showRunLookup">{{ showRunLookup ? '收起历史配对查询' : '历史配对查询' }}</el-button>
            <el-radio-group v-model="chartType" size="small" aria-label="图表类型" @change="renderChart">
              <el-radio-button label="line">折线图</el-radio-button>
              <el-radio-button label="bar">柱状图</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div v-if="focusTaskId" class="focus-bar">
          <span>{{ focusText }}</span>
          <el-button type="text" @click="goToTaskList">查看任务状态</el-button>
          <el-button type="text" @click="clearFocus">显示全部任务</el-button>
        </div>

        <div class="chart-heading">
          <h2>数据移动加速比</h2>
          <p>集中式耗时 ÷ 分布式耗时；高于 1× 表示加速，低于 1× 表示减速。多数据集任务中，每种模式的数据移动时间为该模式下各数据集数据移动时间之和，加速比按两者之和计算。</p>
          <p>页面只展示实测值，不自动判定是否通过 1.2 门槛。</p>
        </div>
        <el-table
          v-show="!error"
          v-loading="loading"
          :data="analysisData"
          row-key="taskId"
          class="analysis-table"
          stripe
          empty-text="暂无可展示的性能数据"
        >
          <el-table-column prop="taskId" label="任务ID" min-width="100" align="center" />
          <el-table-column prop="t2" label="集中式数据移动时间" min-width="200" align="center">
            <template v-slot:default="scope">{{ milliseconds(scope.row.t2) }}</template>
          </el-table-column>
          <el-table-column prop="t1" label="分布式数据移动时间" min-width="200" align="center">
            <template v-slot:default="scope">{{ milliseconds(scope.row.t1) }}</template>
          </el-table-column>
          <el-table-column prop="rating" label="数据移动加速比" min-width="160" align="center">
            <template v-slot:default="scope">{{ speedupText(speedupValue(scope.row)) }}</template>
          </el-table-column>
        </el-table>
        <div v-loading="loading" class="chart-panel">
          <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
          <div v-show="!error && analysisData.length" ref="speedupChart" class="speedup-chart" role="img" :aria-label="chartDescription" />
          <div v-if="!loading && !error && !analysisData.length" class="empty-state">
            <h3>暂无可展示的性能数据</h3>
            <p>完成具有性能分析结果的任务后，可在这里比较加速比；也可以重置搜索条件。</p>
          </div>
        </div>
        <p v-if="analysisData.length && !error" class="chart-note">列表与图表展示当前页相同的 {{ analysisData.length }} 个任务，按任务记录顺序排列。悬停查看加速比与两种耗时；暂无有效测量的 {{ unmeasuredCount }} 个任务在图中留空，不按 0× 展示。</p>

        <div class="page-footer">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="[5, 10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @current-change="handleCurrentChange"
            @size-change="handleSizeChange"
          />
        </div>
      </section>
      <el-dialog title="任务执行原始事件" :visible.sync="evidenceVisible" width="900px">
        <el-table v-if="evidence" :data="evidence.events || []" max-height="440" size="small">
          <el-table-column prop="datasetId" label="数据集" width="90" />
          <el-table-column prop="eventType" label="事件" width="150" />
          <el-table-column prop="nodeName" label="实际节点" min-width="130" />
          <el-table-column prop="inputPath" label="输入路径" min-width="200" show-overflow-tooltip />
          <el-table-column prop="bytesProcessed" label="字节数" width="110" />
          <el-table-column prop="checksumSha256" label="SHA-256" min-width="170" show-overflow-tooltip />
          <el-table-column prop="occurredAt" label="时间" min-width="170" />
        </el-table>
        <span slot="footer"><el-button @click="evidenceVisible=false">关闭</el-button></span>
      </el-dialog>
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import * as echarts from 'echarts'
import { fetchAnalysisData } from '@/api/managementCenterApi'
import { fetchRegisteredTaskExecution, fetchTaskRunComparison } from '@/api/registrationApi'
import { buildSpeedupOption, taskLabel, speedupText, milliseconds, speedupValue } from '@/utils/analysis-chart'
import { fetchAllPages } from '@/utils/dataset-catalog'

// 从数据选择页跳转过来（?taskId=）时，任务可能还在执行，定时刷新直到出现测量结果。
const FOCUS_REFRESH_MS = 5000

function queryTaskId(value) {
  return value == null ? '' : String(value).trim()
}

export default {
  name: 'Analyze',
  data() {
    return {
      currentPage: 1,
      pageSize: 10,
      chartType: 'line',
      loading: false,
      error: '',
      total: 0,
      requestVersion: 0,
      formInline: { name: '' },
      analysisData: [],
      focusTaskId: '',
      showRunLookup: false,
      runLookup: { id: '', round: 1 },
      comparison: null,
      comparisonLoading: false,
      comparisonError: '',
      evidenceVisible: false,
      evidence: null
    }
  },
  computed: {
    unmeasuredCount() {
      return this.analysisData.filter(row => speedupValue(row) == null).length
    },
    chartDescription() {
      return this.analysisData.map(row => `${taskLabel(row)}，加速比 ${speedupText(speedupValue(row))}，集中式耗时 ${milliseconds(row.t2)}，分布式耗时 ${milliseconds(row.t1)}`).join('；')
    },
    focusText() {
      if (!this.focusTaskId) return ''
      if (this.analysisData.length) return `仅显示任务 #${this.focusTaskId} 的性能数据。`
      if (this.loading) return `正在加载任务 #${this.focusTaskId} 的性能数据…`
      if (this.error) return `任务 #${this.focusTaskId} 的性能数据加载失败，本页每 5 秒自动重试。`
      return `任务 #${this.focusTaskId} 暂无性能数据：分布式与集中式两种模式的数据移动都有实测结果后才会显示，本页每 5 秒自动刷新。`
    }
  },
  watch: {
    '$route.query.taskId'(taskId) {
      const next = queryTaskId(taskId)
      if (next === this.focusTaskId) return
      this.focusTaskId = next
      this.currentPage = 1
      this.fetchData()
    }
  },
  created() {
    const { runId, round, taskId } = (this.$route && this.$route.query) || {}
    this.focusTaskId = queryTaskId(taskId)
    this.fetchData()
    if (runId) {
      this.showRunLookup = true
      this.runLookup = { id: String(runId), round: round ? Number(round) : 1 }
      this.loadComparison()
    }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.speedupChart)
    this.renderChart()
    window.addEventListener('resize', this.resizeChart)
    if (typeof ResizeObserver !== 'undefined') {
      this.chartObserver = new ResizeObserver(this.resizeChart)
      this.chartObserver.observe(this.$el)
    }
    this.focusTimer = window.setInterval(this.refreshFocus, FOCUS_REFRESH_MS)
  },
  beforeDestroy() {
    this.requestVersion++
    window.clearInterval(this.focusTimer)
    window.removeEventListener('resize', this.resizeChart)
    if (this.chartObserver) this.chartObserver.disconnect()
    if (this.chart) this.chart.dispose()
    this.chart = null
  },
  methods: {
    milliseconds,
    speedupText,
    speedupValue,
    rawMs(value) { return value == null ? '—' : `${value} ms` },
    refreshFocus() {
      if (!this.focusTaskId || this.analysisData.length || this.loading) return null
      return this.fetchData(true)
    },
    clearFocus() {
      this.focusTaskId = ''
      this.currentPage = 1
      return this.fetchData()
    },
    goToTaskList() {
      this.$router.push({ path: '/operations/tasks', query: { taskId: this.focusTaskId }})
    },
    async loadComparison() {
      if (!this.runLookup.id || this.comparisonLoading) return
      this.comparisonLoading = true
      this.comparisonError = ''
      try {
        this.comparison = await fetchTaskRunComparison(this.runLookup.id, this.runLookup.round)
      } catch (error) {
        this.comparison = null
        this.comparisonError = `实测配对加载失败：${error.message}`
      } finally {
        this.comparisonLoading = false
      }
    },
    async showEvidence(taskId) {
      if (!taskId) return
      try {
        this.evidence = await fetchRegisteredTaskExecution(taskId)
        this.evidenceVisible = true
      } catch (error) {
        this.$message.error(`执行证据加载失败：${error.message}`)
      }
    },
    resizeChart() {
      if (this.chart) this.chart.resize()
    },
    renderChart() {
      this.$nextTick(() => {
        if (!this.chart) return
        this.chart.setOption(buildSpeedupOption(this.analysisData, this.chartType), true)
        this.resizeChart()
      })
    },
    async fetchData(silent = false) {
      const version = ++this.requestVersion
      if (!silent) {
        this.loading = true
        this.error = ''
      }
      try {
        let rows
        let total
        if (this.focusTaskId) {
          // 列表接口的 query 只匹配任务名称，无法按任务 ID 检索；按 ID 定位时取全量后在前端过滤。
          const focusTaskId = this.focusTaskId
          const all = await fetchAllPages(({ page, pageSize }) => fetchAnalysisData(page, pageSize, ''))
          rows = all.filter(row => String(row.taskId) === focusTaskId)
          total = rows.length
        } else {
          const res = await fetchAnalysisData(this.currentPage, this.pageSize, this.formInline.name.trim())
          rows = res.list || []
          total = res.total == null ? rows.length : res.total
        }
        if (version !== this.requestVersion) return
        this.analysisData = rows
        this.total = total
        this.error = ''
      } catch (err) {
        if (version !== this.requestVersion) return
        this.analysisData = []
        this.total = 0
        this.error = '性能数据加载失败，请重新搜索或重置后重试。'
      } finally {
        if (version === this.requestVersion) {
          this.loading = false
          this.renderChart()
        }
      }
    },
    // 手动搜索或重置时退出按任务 ID 定位的视图。
    onSearch() {
      this.focusTaskId = ''
      this.currentPage = 1
      return this.fetchData()
    },
    onCancel() {
      this.formInline.name = ''
      this.focusTaskId = ''
      this.currentPage = 1
      return this.fetchData()
    },
    handleCurrentChange(val) {
      this.currentPage = val
      return this.fetchData()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      return this.fetchData()
    }
  }
}
</script>

<style scoped>
.analyze-page { min-height: calc(100vh - 90px); background: #f5f7fa; flex-direction: column; }
.page-main { padding: 0 16px 16px; }
.content-card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, .04); }
.run-lookup { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
.run-lookup .el-input { width: 280px; }
.comparison-table { margin-bottom: 10px; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.toolbar .el-form-item { margin-bottom: 12px; }
.toolbar-actions { display: flex; align-items: center; gap: 12px; }
.focus-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; padding: 8px 12px; background: #f4f7f9; border-radius: 4px; color: #4f5d6b; font-size: 13px; }
.chart-heading { margin: 12px 0 20px; }
.chart-heading h2 { margin: 0 0 10px; color: #253747; font-size: 20px; font-weight: 600; }
.chart-heading p, .chart-note { color: #697986; font-size: 13px; line-height: 1.7; margin: 0; }
.analysis-table { width: 100%; margin-bottom: 24px; }
.chart-panel { min-height: 400px; }
.speedup-chart { width: 100%; height: 420px; }
.empty-state { padding: 110px 20px; text-align: center; color: #788692; }
.empty-state h3 { font-size: 16px; font-weight: 500; }
.empty-state p { font-size: 13px; line-height: 1.8; }
.page-footer { margin-top: 24px; overflow-x: auto; text-align: center; }
.copyright-bar { padding: 10px; color: #666; font-size: 12px; text-align: center; }
@media (max-width: 640px) {
  .page-main { padding: 0 8px 12px; }
  .content-card { padding: 16px 12px; }
  .speedup-chart { height: 360px; }
  .chart-panel { min-height: 360px; }
}
</style>
