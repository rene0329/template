<!--节点管理模块-->
<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div class="content-card">
        <div class="search-container">
          <el-form :inline="true" :model="formInline" size="medium">
            <el-form-item>
              <el-input v-model="formInline.name" placeholder="请输入节点名称" />
            </el-form-item>
            <el-button @click="onSearch">搜索</el-button>
            <el-button @click="onCancel">重置</el-button>
          </el-form>
        </div>

        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table
                class="my-table"
                :data="currentPageData"
                style="width: 100%; min-width: 960px;"
                :default-sort="{prop: 'nodeId', order: 'upward'}"
              >
                <el-table-column
                  prop="nodeId"
                  label="编号"
                  :min-width="120"
                  sortable
                  align="center"
                />
                <el-table-column prop="nodeName" label="节点名称" :min-width="150" align="center">
                  <template slot-scope="{ row }">
                    <el-link type="primary" @click="openDetail(row)">{{ row.nodeName }}</el-link>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="internalIp"
                  label="IP地址"
                  sortable
                  :min-width="150"
                  align="center"
                />
                <el-table-column
                  prop="type"
                  label="节点类型"
                  :min-width="140"
                  align="center"
                />
                <el-table-column
                  prop="cluster"
                  label="所属集群"
                  :min-width="140"
                  align="center"
                />
                <el-table-column label="操作" :min-width="120" align="center" header-align="center">
                  <template slot-scope="scope">
                    <el-button type="text" size="middle" @click="openTaskDialog(scope.row)">详情</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>

        <!-- 资源使用情况弹窗 -->
        <el-dialog
          :title="`${selected?.node_name || ''} 资源使用情况`"
          :visible.sync="dialogVisibleCharts"
          width="900px"
          @opened="initCharts"
        >
          <div class="charts">
            <div id="radar" class="chart radar"></div>
            <div class="gauges">
              <div class="gauge">
                <div class="gauge-title">CPU 使用率</div>
                <div id="gaugeCpu" class="chart"></div>
              </div>
              <div class="gauge">
                <div class="gauge-title">内存 使用率</div>
                <div id="gaugeMem" class="chart"></div>
              </div>
              <div class="gauge">
                <div class="gauge-title">存储 使用率</div>
                <div id="gaugeDisk" class="chart"></div>
              </div>
            </div>
          </div>

          <span slot="footer" class="dialog-footer">
            <el-button @click="dialogVisibleCharts=false">关 闭</el-button>
          </span>
        </el-dialog>

        <!-- 节点详情对话框 -->
        <el-dialog title="节点详情" :visible="dialogVisibleDetail" @close="closeTaskDialog" custom-class="node-detail-dialog">
          <el-form :model="selectedTask" :rules="rules" ref="taskForm">
            <el-form-item label="节点名称" prop="id">
              <el-input v-model="selectedTask.id" :disabled="!editing"></el-input>
            </el-form-item>
            <el-form-item label="IP地址" prop="ip_address">
              <el-input v-model="selectedTask.ip_address" :disabled="!editing"></el-input>
            </el-form-item>
            <el-form-item label="掩码" prop="subnet_mask">
              <el-input v-model="selectedTask.subnet_mask" :disabled="!editing"></el-input>
            </el-form-item>
            <el-form-item label="节点类型" prop="node_type">
              <el-input v-model="selectedTask.node_type" :disabled="true"></el-input>
            </el-form-item>
            <el-form-item label="所属集群" prop="cluster">
              <el-input v-model="selectedTask.cluster" :disabled="!editing"></el-input>
            </el-form-item>
          </el-form>

          <el-button v-if="!editing" @click="editing = true">修改</el-button>
          <el-button v-else @click="saveChanges">提交</el-button>
        </el-dialog>

        <div class="page-footer">
          <div class="pagination-container">
            <span class="pagination-total">共 {{ total }} 条</span>
            <span class="pagination-sizes-label">每页</span>
            <el-select v-model="pageSize" class="pagination-sizes-select" size="mini" @change="handleSizeChange">
              <el-option :value="5" label="5"></el-option>
              <el-option :value="10" label="10"></el-option>
              <el-option :value="20" label="20"></el-option>
              <el-option :value="50" label="50"></el-option>
            </el-select>
            <span class="pagination-sizes-label">条</span>
            <el-pagination
              :current-page="currentPage"
              :page-size="pageSize"
              layout="prev, pager, next, jumper"
              :total="total"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import * as echarts from 'echarts'
import { fetchNodeSettings, updateNodeSettings, fetchNodeMetrics } from '@/api/managementCenterApi'

export default {
  name: 'NodeList',
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleLogs: false,
      dialogVisibleDetail: false,
      dialogVisibleCharts: false,
      logsKey: 0,
      selected: null,
      systemName: '网络配置',
      headerRightText: '欢迎使用',
      loading: false,
      total: 0,
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      TaskData: [],
      node_name: '',
      selectedTask: {},
      editing: false,
      rules: {}
    }
  },
  computed: {
    currentPageData() {
      return this.TaskData
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {},
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await fetchNodeSettings(this.currentPage, this.pageSize, this.formInline.name)
        this.TaskData = res.list || []
        this.total = res.total || this.TaskData.length
      } catch (err) {
        console.error('获取节点配置失败:', err)
        this.$message.error('获取节点配置失败')
      } finally {
        this.loading = false
      }
    },
    onSearch() {
      this.currentPage = 1
      this.fetchData()
    },
    onCancel() {
      this.formInline.name = ''
      this.currentPage = 1
      this.fetchData()
    },
    onRefresh() {
      this.fetchData()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchData()
    },
    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchData()
    },
    openTaskDialog(task) {
      this.selectedTask = { ...task }
      this.dialogVisibleDetail = true
    },
    closeTaskDialog() {
      this.dialogVisibleDetail = false
      this.editing = false
    },
    async saveChanges() {
      try {
        await updateNodeSettings(this.selectedTask)
        this.editing = false
        this.$message({ message: '修改成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('修改失败:', err)
        this.$message.error('修改失败')
      }
    },
    async openDetail(row) {
      this.selected = row
      // 尝试从服务器获取最新的节点指标
      try {
        const res = await fetchNodeMetrics(row.id)
        if (res && res.metrics) {
          this.selected = { ...row, metrics: res.metrics }
        }
      } catch (err) {
        console.warn('获取节点指标失败，使用缓存数据:', err)
      }
      this.dialogVisibleCharts = true
    },
    initCharts() {
      if (!this.selected) return
      const { cpu, mem, disk } = this.selected.metrics

      const radar = echarts.init(document.getElementById('radar'))
      radar.setOption({
        tooltip: {},
        radar: {
          indicator: [
            { name: 'CPU', max: 100 },
            { name: '存储', max: 100 },
            { name: '内存', max: 100 }
          ],
          center: ['50%', '65%'],
          radius: 90,
          splitArea: { areaStyle: { color: ['#fafafa','#f5f5f5'] } }
        },
        series: [{
          type: 'radar',
          data: [{ value: [cpu, disk, mem] }],
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.1 }
        }]
      })

      const mkGauge = (elId, val) => {
        const inst = echarts.init(document.getElementById(elId))
        inst.setOption({
          series: [{
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: 100,
            splitNumber: 10,
            axisLine: {
              lineStyle: {
                width: 12,
                color: [
                  [0.3, '#91cc75'],
                  [0.7, '#5470c6'],
                  [1, '#ee6666']
                ]
              }
            },
            pointer: { show: true, length: '65%', width: 6},
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { valueAnimation: true, formatter: '{value}%', fontSize: 22, offsetCenter: [0, '70%']},
            data: [{ value: val }]
          }]
        })
        return inst
      }
      mkGauge('gaugeCpu', cpu)
      mkGauge('gaugeMem', mem)
      mkGauge('gaugeDisk', disk)

      window.addEventListener('resize', () => {
        radar.resize()
        echarts.getInstanceByDom(document.getElementById('gaugeCpu'))?.resize()
        echarts.getInstanceByDom(document.getElementById('gaugeMem'))?.resize()
        echarts.getInstanceByDom(document.getElementById('gaugeDisk'))?.resize()
      }, { once: true })
    }
  }
}
</script>

<style scoped>
.analyze-page {
  height: calc(100vh - 90px);
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}
.global-header {
  height: 50px;
  background: #202231;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-sizing: border-box;
}
.brand { 
  font-size: 16px; 
  font-weight: 600; 
}
.header-meta { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  font-size: 14px; 
}
.header-avatar { 
  margin-right: 4px; 
}
.header-user { 
  font-size: 14px; 
}
.breadcrumb-bar {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: #f0f2f5;
  color: #666666;
  box-sizing: border-box;
}
.page-main {
  flex: 1;
  padding: 0px 16px 0px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.content-card {
  flex: 1;
  background: #ffffff;
  border-radius: 6px;
  padding: 16px 24px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.search-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0;
  gap: 8px;
  background: transparent;
}
.search-container :deep(.el-form--inline) {
  display: flex;
  align-items: center;
}
.search-container :deep(.el-form--inline .el-form-item) {
  margin-right: 8px;
  margin-bottom: 0;
}
.search-container :deep(.el-form-item__content) {
  line-height: 32px;
}
.search-container :deep(.el-input__inner) {
  height: 32px;
  line-height: 32px;
}
.search-container :deep(.el-button) {
  height: 32px;
  line-height: 32px;
  padding: 0 16px;
}
.content-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.table-card {
  flex: 1 1 100%;
  max-width: 100%;
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-sizing: border-box;
  box-shadow: none;
}
.table-wrapper {
  width: 100%;
  overflow-x: auto;
}
.page-footer {
  padding: 16px 0;
  box-sizing: border-box;
}
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 20px 0;
}
.pagination-total {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}
.pagination-sizes-label {
  font-size: 14px;
  color: #606266;
}
.pagination-sizes-select {
  width: 70px;
}
.pagination-sizes-select :deep(.el-input__inner) {
  height: 28px;
  line-height: 28px;
  padding: 0 8px;
}
.pagination-sizes-select :deep(.el-input__suffix) {
  right: 5px;
}
.copyright-bar {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
  font-size: 12px;
  background: transparent;
  flex-shrink: 0;
}
:deep(.my-table .el-table__header-wrapper th.el-table__cell) {
  height: 54px;
  padding: 0 !important;      /* 关键：干掉默认 padding 才能保证总高=54 */
  background: #f5f7fa;
  color: #333333;
  font-weight: 600;
}

/* 表头文字容器也锁定为 54，确保垂直居中 */
:deep(.my-table .el-table__header-wrapper th.el-table__cell .cell) {
  line-height: 54px;
  padding: 0 !important;
}
:deep(.my-table .el-table__body-wrapper td.el-table__cell) {
  height: 54px;
  padding: 0 !important;
}

:deep(.my-table .el-table__body-wrapper td.el-table__cell .cell) {
  line-height: 54px;
}

:deep(.el-table__empty-block) {
  min-height: 54px;            /* 空状态区域高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;          /* 想要淡灰底 */
}
:deep(.el-table__empty-text) {
  color: #909399;
  font-size: 14px;
  letter-spacing: 1px;
}

:deep(.el-button--primary) {
  background: linear-gradient(90deg, #4ec58c, #497aae);
  border-color: #4ec58c;
  color: #ffffff;
}
:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus) {
  background: linear-gradient(90deg, #3da371, #335f8d);
  border-color: #0bb677;
  color: #ffffff;
}
:deep(.el-button--default) {
  border-color: #dcdfe6;
  color: #666666;
}
:deep(.el-button--default:hover),
:deep(.el-button--default:focus) {
  background: #e6f2ee;
  border-color: #0c8357;
  color: #0c8357;
}
:deep(.el-button--text) {
  color: #0c8357;
}
:deep(.el-button--text:hover),
:deep(.el-button--text:focus) {
  color: #0bb677;
}
.charts {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.radar {
  width: 420px;
  height: 360px;
  margin: 20px auto 20px;
}
.gauges {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-column-gap: 24px;
  margin-top: 40px;
}
.gauge { 
  text-align: center; 
}
.gauge-title { 
  margin-bottom: 8px; 
  font-weight: 600; 
  color: #333; 
}
.chart { 
  width: 100%; 
  height: 180px; 
}
.node-detail-dialog .el-dialog__body {
  padding-bottom: 24px;
}
</style>
