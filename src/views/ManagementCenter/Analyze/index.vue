<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <section class="content-card">
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
          <el-radio-group v-model="chartType" size="small" aria-label="图表类型" @change="renderChart">
            <el-radio-button label="line">折线图</el-radio-button>
            <el-radio-button label="bar">柱状图</el-radio-button>
          </el-radio-group>
        </div>

        <div class="chart-heading">
          <h2>数据移动加速比</h2>
          <p>集中式耗时 ÷ 分布式耗时；高于 1× 表示加速，低于 1× 表示减速。</p>
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
          <el-table-column prop="t2" label="集中式计算数据移动时间" min-width="220" align="center">
            <template v-slot:default="scope">{{ milliseconds(scope.row.t2) }}</template>
          </el-table-column>
          <el-table-column prop="t1" label="分布式计算数据移动时间" min-width="220" align="center">
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
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import * as echarts from 'echarts'
import { fetchAnalysisData } from '@/api/managementCenterApi'
import { buildSpeedupOption, taskLabel, speedupText, milliseconds, speedupValue } from '@/utils/analysis-chart'

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
      analysisData: []
    }
  },
  computed: {
    unmeasuredCount() {
      return this.analysisData.filter(row => speedupValue(row) == null).length
    },
    chartDescription() {
      return this.analysisData.map(row => `${taskLabel(row)}，加速比 ${speedupText(speedupValue(row))}，集中式耗时 ${milliseconds(row.t2)}，分布式耗时 ${milliseconds(row.t1)}`).join('；')
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    this.chart = echarts.init(this.$refs.speedupChart)
    this.renderChart()
    window.addEventListener('resize', this.resizeChart)
    if (typeof ResizeObserver !== 'undefined') {
      this.chartObserver = new ResizeObserver(this.resizeChart)
      this.chartObserver.observe(this.$el)
    }
  },
  beforeDestroy() {
    this.requestVersion++
    window.removeEventListener('resize', this.resizeChart)
    if (this.chartObserver) this.chartObserver.disconnect()
    if (this.chart) this.chart.dispose()
    this.chart = null
  },
  methods: {
    milliseconds,
    speedupText,
    speedupValue,
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
    async fetchData() {
      const version = ++this.requestVersion
      this.loading = true
      this.error = ''
      try {
        const res = await fetchAnalysisData(this.currentPage, this.pageSize, this.formInline.name.trim())
        if (version !== this.requestVersion) return
        this.analysisData = res.list || []
        this.total = res.total == null ? this.analysisData.length : res.total
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
    onSearch() {
      this.currentPage = 1
      return this.fetchData()
    },
    onCancel() {
      this.formInline.name = ''
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
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.toolbar .el-form-item { margin-bottom: 12px; }
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
