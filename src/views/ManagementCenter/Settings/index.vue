<!--节点管理模块-->
<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div v-loading="loading" class="content-card">
        <div class="search-container">
          <el-form :inline="true" :model="formInline" size="medium">
            <el-form-item>
              <el-input v-model="formInline.name" placeholder="请输入节点名称" />
            </el-form-item>
            <el-button @click="onSearch">搜索</el-button>
            <el-button @click="onCancel">重置</el-button>
          </el-form>
          <live-refresh-status class="live-refresh-anchor" :updated-at="lastUpdatedAt" />
        </div>

        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table
                class="my-table"
                :data="currentPageData"
                style="width: 100%; min-width: 960px;"
                :default-sort="{prop: 'nodeId', order: 'upward'}"
                highlight-current-row
                :row-class-name="nodeRowClassName"
                @row-click="selectDatasetNode"
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
                    <el-link type="primary" @click.stop="openDetail(row)">{{ row.nodeName }}</el-link>
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
                >
                  <template slot-scope="{ row }">
                    {{ nodeTypeLabel(row.type) }}
                  </template>
                </el-table-column>
                <el-table-column
                  prop="cluster"
                  label="所属集群"
                  :min-width="140"
                  align="center"
                />
                <el-table-column label="数据集" :min-width="100" align="center">
                  <template slot-scope="scope">
                    <el-button type="text" @click.stop="selectDatasetNode(scope.row)">
                      {{ datasetCountForNode(scope.row) }} 个
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column label="节点状态" :min-width="120" align="center">
                  <template slot-scope="scope">
                    <el-tag size="mini" :type="nodeStatusType(scope.row)">
                      {{ nodeStatusLabel(scope.row) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" :min-width="120" align="center" header-align="center">
                  <template slot-scope="scope">
                    <el-button type="text" size="middle" @click.stop="openTaskDialog(scope.row)">详情</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>

        <section class="dataset-panel">
          <el-alert v-if="datasetError" :title="datasetError" type="warning" :closable="false" />
          <el-alert v-if="nodeError" :title="nodeError" type="warning" :closable="false" />
          <div class="dataset-panel__header">
            <div>
              <strong>节点数据集</strong>
              <el-tag v-if="selectedDatasetNode" size="mini" type="info">
                {{ selectedDatasetNode.nodeName }}
              </el-tag>
              <span class="dataset-count">{{ selectedNodeDatasets.length }} 个数据集 / {{ selectedNodeDatasets.reduce((n, d) => n + d.replicaCount, 0) }} 个副本</span>
            </div>
            <span class="dataset-hint">点击节点行切换查看</span>
          </div>
          <el-table
            :data="selectedNodeDatasets"
            size="mini"
            max-height="190"
            empty-text="该节点暂无数据集"
          >
            <el-table-column prop="dataName" label="数据集名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="fileType" label="类型" width="100" align="center">
              <template slot-scope="scope">{{ scope.row.fileType || '-' }}</template>
            </el-table-column>
            <el-table-column label="大小" width="120" align="right">
              <template slot-scope="scope">{{ formatBytes(scope.row.dataSize) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template slot-scope="scope">
                <el-tag size="mini" :type="scope.row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="90" align="center" />
            <el-table-column prop="replicaStatus" label="本节点副本状态" min-width="170" show-overflow-tooltip />
            <el-table-column prop="filePath" label="文件路径" min-width="260" show-overflow-tooltip />
          </el-table>
        </section>

        <!-- 资源使用情况弹窗 -->
        <el-dialog
          :title="`${selectedNodeTitle} 资源使用情况`"
          :visible.sync="dialogVisibleCharts"
          width="900px"
          @opened="initCharts"
        >
          <div class="charts">
            <div id="radar" class="chart radar" />
            <div class="gauges">
              <div class="gauge">
                <div class="gauge-title">CPU 使用率</div>
                <div id="gaugeCpu" class="chart" />
              </div>
              <div class="gauge">
                <div class="gauge-title">内存 使用率</div>
                <div id="gaugeMem" class="chart" />
              </div>
              <div class="gauge">
                <div class="gauge-title">存储 使用率</div>
                <div id="gaugeDisk" class="chart" />
              </div>
            </div>
          </div>

          <span slot="footer" class="dialog-footer">
            <el-button @click="dialogVisibleCharts=false">关 闭</el-button>
          </span>
        </el-dialog>

        <!-- 节点详情对话框 -->
        <el-dialog title="节点详情" :visible="dialogVisibleDetail" custom-class="node-detail-dialog" @close="closeTaskDialog">
          <el-form ref="taskForm" :model="selectedTask" :rules="rules">
            <el-form-item label="节点名称" prop="nodeName">
              <el-input v-model="selectedTask.nodeName" disabled />
            </el-form-item>
            <el-form-item label="显示名称" prop="displayName">
              <el-input v-model="selectedTask.displayName" :disabled="!editing" />
            </el-form-item>
            <el-form-item label="内网IP" prop="internalIp">
              <el-input v-model="selectedTask.internalIp" :disabled="true" />
            </el-form-item>
            <el-form-item label="外网IP" prop="externalIp">
              <el-input v-model="selectedTask.externalIp" :disabled="true" />
            </el-form-item>
            <el-form-item label="节点类型" prop="node_type">
              <el-input :value="nodeTypeLabel(selectedTask.type || selectedTask.node_type)" :disabled="true" />
            </el-form-item>
            <el-form-item label="所属集群" prop="cluster">
              <el-input v-model="selectedTask.cluster" disabled />
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
              <el-option :value="5" label="5" />
              <el-option :value="10" label="10" />
              <el-option :value="20" label="20" />
              <el-option :value="50" label="50" />
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
import LiveRefreshStatus from '@/components/LiveRefreshStatus'
import { keepStableCollection } from '@/utils/live-refresh'
import { fetchRegisteredNodes, fetchRegisteredDatasets, updateRegisteredNode } from '@/api/registrationApi'
import { fetchAllPages, datasetsForNode, formatBytes } from '@/utils/dataset-catalog'
import {
  fetchNodeMetrics
} from '@/api/managementCenterApi'

export default {
  name: 'NodeList',
  components: { LiveRefreshStatus },
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
      refreshing: false,
      requestVersion: 0,
      datasetTimer: null,
      datasetsLoading: false,
      datasetError: '',
      nodeError: '',
      refreshTimer: null,
      lastUpdatedAt: '',
      total: 0,
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      TaskData: [],
      datasets: [],
      selectedNodeId: '',
      node_name: '',
      selectedTask: {},
      editing: false,
      rules: {}
    }
  },
  computed: {
    selectedNodeTitle() {
      return this.selected ? (this.selected.nodeName || this.selected.node_name || '') : ''
    },
    currentPageData() {
      return this.TaskData
    },
    selectedDatasetNode() {
      return this.TaskData.find(node => String(node.nodeId) === this.selectedNodeId) || null
    },
    selectedNodeDatasets() {
      if (!this.selectedDatasetNode) return []
      return datasetsForNode(this.datasets, this.selectedDatasetNode.nodeId, { excludeMissing: true })
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    this.refreshDatasets()
    this.datasetTimer = window.setInterval(this.refreshDatasets, 10000)
    this.refreshTimer = window.setInterval(() => this.fetchData(true), 1000)
  },
  beforeDestroy() {
    window.clearInterval(this.refreshTimer)
    window.clearInterval(this.datasetTimer)
    this.requestVersion++
  },
  methods: {
    async refreshDatasets() {
      if (this.datasetsLoading) return
      this.datasetsLoading = true
      try {
        const datasets = await fetchAllPages(fetchRegisteredDatasets, { silent: true })
        if (this._isDestroyed) return
        this.datasets = keepStableCollection(this.datasets, datasets)
        this.datasetError = ''
      } catch (error) {
        this.datasetError = `数据集加载失败（保留上次结果）：${error.message}`
      } finally {
        this.datasetsLoading = false
      }
    },
    async fetchData(silent = false) {
      if (silent && this.refreshing) return
      const version = ++this.requestVersion
      this.refreshing = true
      if (!silent) this.loading = true
      try {
        const options = silent ? { silent: true } : {}
        const nodePage = await fetchRegisteredNodes({ page: this.currentPage, pageSize: this.pageSize, query: this.formInline.name }, options)
        if (version !== this.requestVersion) return
        this.TaskData = keepStableCollection(this.TaskData, nodePage.list.map(node => ({
          ...node, nodeName: node.k8sNodeName, cluster: node.clusterId, type: node.role.toLowerCase().replace(/_/g, '-')
        })))
        this.total = nodePage.total
        if (!this.TaskData.some(node => String(node.nodeId) === this.selectedNodeId)) {
          const preferred = this.TaskData.find(node => this.datasetCountForNode(node) > 0)
          this.selectedNodeId = preferred ? String(preferred.nodeId) : (this.TaskData[0] ? String(this.TaskData[0].nodeId) : '')
        }
        this.lastUpdatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
        this.nodeError = ''
      } catch (err) {
        if (version !== this.requestVersion) return
        this.nodeError = `节点更新失败（保留上次结果）：${err.message}`
        console.error('获取节点配置失败:', err)
        if (!silent) this.$message.error('获取节点配置失败')
      } finally {
        if (version === this.requestVersion) {
          this.loading = false
          this.refreshing = false
        }
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
    selectDatasetNode(node) {
      this.selectedNodeId = String(node.nodeId)
    },
    nodeRowClassName({ row }) {
      return String(row.nodeId) === this.selectedNodeId ? 'selected-node-row' : ''
    },
    datasetBelongsToNode(dataset, node) {
      if (dataset.dataNodeId != null && node.nodeId != null) {
        return String(dataset.dataNodeId) === String(node.nodeId)
      }
      return String(dataset.dataServer || '').trim() === String(node.nodeName || '').trim()
    },
    datasetCountForNode(node) {
      return datasetsForNode(this.datasets, node.nodeId, { excludeMissing: true }).length
    },
    formatBytes,
    openTaskDialog(task) {
      this.selectedTask = { ...task }
      this.dialogVisibleDetail = true
    },
    closeTaskDialog() {
      this.dialogVisibleDetail = false
      this.editing = false
    },
    nodeTypeLabel(type) {
      const map = {
        'storage': '存储节点',
        'compute-storage': '计算存储节点',
        'compute': '计算节点',
        'master': '主节点',
        'worker': '工作节点'
      }
      return map[type] || type || '-'
    },
    nodeStatus(row) {
      return row.effectiveStatus || row.observedStatus || row.status || 'UNKNOWN'
    },
    nodeStatusLabel(row) {
      const status = this.nodeStatus(row)
      const map = {
        'AVAILABLE': '可用',
        'READY': '可用',
        'INACTIVE': '维护中',
        'DISABLED': '已停用',
        'OFFLINE': '离线',
        'NOT_READY': '异常',
        'UNKNOWN': '未知'
      }
      return map[status] || status
    },
    nodeStatusType(row) {
      const status = this.nodeStatus(row)
      const map = {
        'AVAILABLE': 'success',
        'READY': 'success',
        'INACTIVE': 'warning',
        'DISABLED': 'info',
        'OFFLINE': 'danger',
        'NOT_READY': 'danger'
      }
      return map[status] || 'info'
    },
    async saveChanges() {
      try {
        const updated = await updateRegisteredNode(this.selectedTask.nodeId, {
          displayName: this.selectedTask.displayName, version: this.selectedTask.version
        })
        this.selectedTask = { ...this.selectedTask, ...updated }
        this.editing = false
        this.$message({ message: '修改成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('修改失败:', err)
        this.$message.error(err.message || '修改失败')
      }
    },
    async openDetail(row) {
      this.selectDatasetNode(row)
      this.selected = row
      // 尝试从服务器获取最新的节点指标
      try {
        const res = await fetchNodeMetrics(row.nodeId)
        if (res) {
          const cpu = res.maxCpu > 0 && res.currentCpu != null ? Number((res.currentCpu / res.maxCpu * 100).toFixed(2)) : null
          const mem = res.maxMemory > 0 && res.currentMemory != null ? Number((res.currentMemory / res.maxMemory * 100).toFixed(2)) : null
          const disk = null
          this.selected = {
            ...row,
            ...res,
            metrics: { cpu, mem, disk }
          }
        }
      } catch (err) {
        console.warn('获取节点指标失败，使用缓存数据:', err)
      }
      this.dialogVisibleCharts = true
    },
    initCharts() {
      if (!this.selected) return
      const metrics = this.selected.metrics || { cpu: null, mem: null, disk: null }
      const { cpu, mem, disk } = metrics

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
          splitArea: { areaStyle: { color: ['#fafafa', '#f5f5f5'] }}
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
            pointer: { show: val != null, length: '65%', width: 6 },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { valueAnimation: true, formatter: val == null ? '暂无数据' : '{value}%', fontSize: 22, offsetCenter: [0, '70%'] },
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
.live-refresh-anchor {
  margin-left: auto;
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
.dataset-panel {
  min-height: 190px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}
.dataset-panel__header {
  min-height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  background: #f8fafb;
  color: #303133;
}
.dataset-panel__header strong {
  margin-right: 10px;
}
.dataset-count,
.dataset-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
:deep(.selected-node-row > td.el-table__cell) {
  background: #eef8f4 !important;
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
