<!--数据管理模块-->
<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div class="content-card">
        <div class="search-container">
          <el-form :inline="true" :model="formInline" size="medium">
            <el-form-item>
              <el-input v-model="formInline.name" placeholder="请输入数据集名称" />
            </el-form-item>
            <el-button @click="onSearch">搜索</el-button>
            <el-button @click="onCancel">重置</el-button>
          </el-form>
          <div class="action-buttons">
            <el-button type="primary" @click="onUpdateHeatAll" :loading="heatLoading">热度全部更新</el-button>
            <el-button type="primary" @click="onHeatSensitiveStorage" :loading="storageLoading">热敏存储</el-button>
            <el-button type="primary" @click="onInSituAggregation" :loading="aggregationLoading">原位汇聚</el-button>
          </div>
        </div>

        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table
                :data="currentPageData"
                style="width: 100%;"
              >
                <el-table-column
                  prop="dataName"
                  label="数据名称"
                  :min-width="150"
                  align="center"
                />
                <el-table-column
                  prop="dataSize"
                  label="大小"
                  :min-width="140"
                  align="center"
                />
                <el-table-column
                  prop="dataHeat"
                  label="热度"
                  :min-width="140"
                  align="center"
                />
                <el-table-column
                  prop="dataStatus"
                  label="状态"
                  :min-width="140"
                  align="center"
                />
                <el-table-column
                  prop="dataServer"
                  label="存储节点"
                  :min-width="140"
                  align="center"
                />
                <el-table-column
                  prop="backupServer"
                  label="备份节点"
                  :min-width="140"
                  align="center"
                />
                <el-table-column label="操作" :min-width="180" align="center" header-align="center">
                  <template slot-scope="scope">
                    <el-button 
                      type="text" 
                      @click="openTaskDialog(scope.row)"
                      class="link-btn"
                    >
                      更新
                    </el-button>
                    <el-button 
                      type="text" 
                      @click="deletescopeTask(scope.row)"
                      class="link-btn"
                    >
                      禁用
                    </el-button>
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
            <el-form-item label="数据名称" prop="id">
              <el-input v-model="selectedTask.id" :disabled="!editing"></el-input>
            </el-form-item>
            <el-form-item label="大小" prop="node_name">
              <el-input v-model="selectedTask.node_name" :disabled="!editing"></el-input>
            </el-form-item>
            <el-form-item label="热度" prop="ip_address">
              <el-input v-model="selectedTask.ip_address" :disabled="!editing"></el-input>
            </el-form-item>
            <el-form-item label="状态" prop="subnet_mask">
              <el-input v-model="selectedTask.subnet_mask" :disabled="true"></el-input>
            </el-form-item>
            <el-form-item label="存储节点" prop="node_type">
              <el-input v-model="selectedTask.node_type" :disabled="!editing"></el-input>
            </el-form-item>
          </el-form>

          <el-button v-if="!editing" @click="editing = true">修改</el-button>
          <el-button v-else @click="saveChanges">提交</el-button>
        </el-dialog>

        <div class="page-footer">
          <div class="pagination-container">
            <span class="pagination-total">共 {{ filteredDataCount }} 条</span>
            <span class="pagination-sizes-label">每页</span>
            <el-select v-model="pageSize" size="mini" class="pagination-sizes-select" @change="handleSizeChange">
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
              :total="filteredDataCount"
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
import { 
  fetchDataManagementList, 
  updateDataItem, 
  toggleDataStatus,
  updateDataHeatAll,
  saveDataStorageAll 
} from '@/api/managementCenterApi'

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
      systemName: '数据管理',
      headerRightText: '欢迎使用',
      loading: false,
      total: 0,
      heatLoading: false,
      storageLoading: false,
      aggregationLoading: false,
      // 用于表单搜索
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      TaskData: [],
      // 用于传递参数
      node_name: '',
      selectedTask: {}, // 存储选中的任务数据
      editing: false,   // 是否处于编辑模式
      rules: {
        // 表单校验规则
      }
    }
  },
  computed: {
    filteredDataCount() {
      return this.total
    },
    currentPageData() {
      // 数据已在服务端分页，直接返回
      return this.TaskData
    }
  },
  created() {
    this.fetchData()
  },

  mounted() {
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await fetchDataManagementList(this.currentPage, this.pageSize, this.formInline.name)
        this.TaskData = res.list || []
        this.total = res.total || this.TaskData.length
      } catch (err) {
        console.error('获取数据失败:', err)
        this.$message.error('获取数据失败')
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
      console.log('refresh!')
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
        await updateDataItem(this.selectedTask)
        this.editing = false
        this.$message({ message: '修改成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('修改失败:', err)
        this.$message.error('修改失败')
      }
    },
    async deletescopeTask(task) {
      try {
        await toggleDataStatus(task.id)
        this.$message({ message: '禁用成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('禁用失败:', err)
        this.$message.error('禁用失败')
      }
    },

    // 热度全部更新
    async onUpdateHeatAll() {
      this.heatLoading = true
      try {
        await updateDataHeatAll()
        this.$message({ message: '热度全部更新成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('热度更新失败:', err)
        this.$message.error('热度更新失败')
      } finally {
        this.heatLoading = false
      }
    },
    // 热敏存储
    async onHeatSensitiveStorage() {
      this.storageLoading = true
      try {
        await saveDataStorageAll()
        this.$message({ message: '热敏存储执行成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('热敏存储失败:', err)
        this.$message.error('热敏存储失败')
      } finally {
        this.storageLoading = false
      }
    },
    // 原位汇聚
    async onInSituAggregation() {
      this.aggregationLoading = true
      try {
        await saveDataStorageAll()
        this.$message({ message: '原位汇聚执行成功', type: 'success' })
        this.fetchData()
      } catch (err) {
        console.error('原位汇聚失败:', err)
        this.$message.error('原位汇聚失败')
      } finally {
        this.aggregationLoading = false
      }
    },

    openDetail(row) {
      this.selected = row
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
  justify-content: space-between;
  align-items: center;
  padding: 0;
  gap: 8px;
  background: transparent;
  flex-wrap: wrap;
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
.action-buttons :deep(.el-button) {
  height: 32px;
  line-height: 32px;
  padding: 0 16px;
}
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.content-row { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 16px; 
}
.table-card {
  flex: 1;
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  box-sizing: border-box;
  min-width: 0;
}
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  display: block;
}
.page-footer {
  padding: 16px 0;
  box-sizing: border-box;
  margin-top: 16px;
}
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
:deep(.el-table__header th) {
  background: #f5f7fa;
  color: #333333;
  font-weight: 600;
  line-height: 54px;
}
:deep(.el-table__body td) {
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
  height: 32px;
  line-height: 32px;
  padding: 0 16px;
}
:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus) {
  background: linear-gradient(90deg, #3da371, #335f8d);
  border-color: #0bb677;
  color: #ffffff;
}
:deep(.el-button--success) {
  background: linear-gradient(90deg, #4ec58c, #497aae);
  border-color: #4ec58c;
  color: #ffffff;
}
:deep(.el-button--success:hover),
:deep(.el-button--success:focus) {
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
  padding: 0 16px;
  height: 32px;
}
:deep(.el-button--text:hover),
:deep(.el-button--text:focus) {
  color: #0bb677;
}
.link-btn {
  color: #0c8357 !important;
  padding: 0 8px !important;
}
.link-btn:hover {
  color: #0bb677 !important;
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
