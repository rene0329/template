<!--数据选择模块-->
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
            <el-select
              v-model="selectedImageId"
              size="medium"
              filterable
              placeholder="选择运行镜像"
              class="image-select"
              :title="'对比任务只关心数据搬运耗时，默认选用 hash-demo（只对数据算哈希）而不是真实训练镜像，避免计算时长掩盖数据移动耗时'"
            >
              <el-option v-for="img in runtimeImages" :key="img.imageId" :label="img.name" :value="img.imageId" />
            </el-select>
            <el-button
              type="primary"
              :loading="submitting"
              :disabled="selectedRows.length === 0 || submitting || !selectedImageId"
              :title="selectedImageId ? '一个任务 ID 内，每个所选数据集都按分布式与集中式两种模式各调度一次' : '没有可用的已激活运行镜像'"
              @click="handleSubmit"
            >创建任务（分布式 + 集中式）</el-button>
          </div>
          <live-refresh-status class="live-refresh-anchor" :updated-at="lastUpdatedAt" />
        </div>
        <div class="content-row">
          <div class="table-card">
            <el-alert v-if="loadError" :title="loadError" type="warning" :closable="false" />
            <el-alert v-if="!runtimeImages.length" title="没有已激活的运行镜像，请先在“资源与数据 - 运行镜像”页注册并激活至少一个镜像。若只想对比数据搬运耗时，推荐注册一个只计算哈希的轻量镜像（如 busybox + sha256sum），避免真实训练/推理耗时掩盖数据移动耗时。" type="warning" :closable="false" />
            <el-alert v-if="submitResult" :title="submitSummary(submitResult)" type="success" :closable="false" />
            <el-button v-if="submitResult" type="text" @click="goToAnalysis">查看性能分析</el-button>
            <div class="table-wrapper">
              <el-table
                ref="datasetTable"
                class="my-table"
                :data="currentPageData"
                style="width: 100%;"
                :default-sort="{prop: 'datasetId', order: 'ascending'}"
                row-key="datasetId"
                @selection-change="handleSelectionChange"
                @sort-change="handleSortChange"
              >
                <el-table-column
                  type="selection"
                  width="55"
                  align="center"
                  reserve-selection
                />
                <el-table-column
                  prop="datasetId"
                  label="数据集 ID"
                  :min-width="70"
                  sortable="custom"
                  align="center"
                />
                <el-table-column
                  prop="dataName"
                  label="数据集名称"
                  :min-width="170"
                  align="center"
                >
                  <template slot-scope="scope">
                    <span>{{ scope.row.dataName ? scope.row.dataName.charAt(0).toUpperCase() + scope.row.dataName.slice(1) : '' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="fileType" label="类型" width="80" align="center">
                  <template slot-scope="scope">
                    <el-tag size="mini" type="info">{{ scope.row.fileType || '-' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="大小" width="100" align="right">
                  <template slot-scope="scope">{{ formatBytes(scope.row.dataSize) }}</template>
                </el-table-column>
                <el-table-column prop="version" label="版本" width="85" />
                <el-table-column prop="category" label="分类" width="100" />
                <el-table-column label="状态" width="125" align="center">
                  <template slot-scope="scope">
                    <el-tag size="mini" :type="scope.row.status === 'ACTIVE' && scope.row.availableReplicaCount > 0 ? 'success' : 'info'">
                      {{ scope.row.status }}
                    </el-tag>
                    <div :title="scope.row.statusReason">{{ scope.row.healthStatus || 'UNKNOWN' }}</div>
                  </template>
                </el-table-column>
                <el-table-column label="可用/全部副本" width="115" align="center">
                  <template slot-scope="scope">{{ scope.row.availableReplicaCount }} / {{ scope.row.totalReplicaCount }}</template>
                </el-table-column>
                <el-table-column label="副本节点 ID" min-width="125" show-overflow-tooltip>
                  <template slot-scope="scope">{{ scope.row.replicas.map(r => r.nodeId).join(' / ') || '-' }}</template>
                </el-table-column>
                <el-table-column label="资源需求" min-width="175">
                  <template slot-scope="scope">{{ resourceLabel(scope.row.requiredResources) }}</template>
                </el-table-column>
                <el-table-column prop="defaultRuntimeImageId" label="运行镜像 ID" width="115" />
                <el-table-column prop="updatedAt" label="副本更新时间" min-width="180" />
                <el-table-column prop="filePath" label="文件路径" min-width="200" show-overflow-tooltip />
                <el-table-column type="expand">
                  <template slot-scope="scope">
                    <p>数据集编码：{{ scope.row.datasetCode }}；标签：{{ scope.row.labels }}；不可用原因：{{ scope.row.statusReason || '无' }}</p>
                    <el-table :data="scope.row.replicas" size="mini">
                      <el-table-column prop="replicaId" label="副本 ID" />
                      <el-table-column prop="nodeId" label="节点 ID" />
                      <el-table-column prop="effectiveAvailability" label="有效状态" />
                      <el-table-column prop="statusReason" label="状态原因" min-width="180" />
                      <el-table-column prop="checksum" label="校验值" min-width="180" show-overflow-tooltip />
                      <el-table-column prop="filePath" label="路径" min-width="220" show-overflow-tooltip />
                    </el-table>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="dataDescription"
                  label="数据集描述"
                  sortable="custom"
                  :min-width="220"
                  show-overflow-tooltip
                />
              </el-table>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <div class="pagination-container">
            <span class="pagination-total">共 {{ total }} 条</span>
            <span class="pagination-sizes-label">每页</span>
            <el-select v-model="pageSize" size="mini" class="pagination-sizes-select" @change="handleSizeChange">
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
import { fetchRegisteredDatasets, fetchRuntimeImages, preflightRegisteredTask, createRegisteredTask, requestId } from '@/api/registrationApi'
import { clampPage, datasetRow, fetchAllPages, formatBytes, paginateRows, sortRows } from '@/utils/dataset-catalog'
import LiveRefreshStatus from '@/components/LiveRefreshStatus'
import { keepStableCollection } from '@/utils/live-refresh'

const ACCESS_DENIED = 'DATASET_ACCESS_DENIED'
const ACCESS_DENIED_MESSAGE = '任务创建失败，用户访问受限'
const MODE_LABELS = { IN_PLACE: '分布式', CENTRALIZED: '集中式' }

// axiosConfig 把 { code, msg, errorCode } 响应体归一化为 error.errorCode；
// 同时兼容未经拦截器归一化、仍挂在 error.response.data 上的响应体。
function isAccessDenied(error) {
  if (!error || typeof error !== 'object') return false
  const body = (error.response && error.response.data) || {}
  return [error.errorCode, error.code, body.errorCode, body.code].includes(ACCESS_DENIED)
}

function checkMode(check) {
  const mode = String(check.executionMode || '').toUpperCase()
  return MODE_LABELS[mode] ? mode : null
}

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
      logsKey: 0,
      selected: null,
      // currentPageData: [],
      selectedRows: [],
      systemName: '可选数据',
      headerRightText: '欢迎使用',
      loading: false,
      refreshing: false,
      requestVersion: 0,
      submitting: false,
      runtimeImages: [],
      selectedImageId: null,
      // 最近一次创建成功的任务：{ taskId, datasetCount }
      submitResult: null,
      // 创建请求超时/失败后重试时复用同一个幂等键和请求体，避免重复建任务。
      pendingSubmission: null,
      loadError: '',
      refreshTimer: null,
      lastUpdatedAt: '',
      total: 0,
      sort: { prop: 'datasetId', order: 'ascending' },
      // 用于表单搜索
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      TaskData: [],
      // 用于传递参数
      dataset_name: '',
      selectedTask: {}, // 存储选中的任务数据
      editing: false, // 是否处于编辑模式
      rules: {
        // 表单校验规则
      }
    }
  },
  computed: {
    currentPageData() {
      return paginateRows(sortRows(this.TaskData, this.sort), this.currentPage, this.pageSize)
    }
  },
  created() {
    this.fetchData()
    this.loadRuntimeImages()
  },

  mounted() {
    this.refreshTimer = window.setInterval(() => this.fetchData(true), 1000)
  },
  beforeDestroy() {
    window.clearInterval(this.refreshTimer)
    this.requestVersion++
  },
  methods: {
    async fetchData(silent = false) {
      if (silent && this.refreshing) return
      const version = ++this.requestVersion
      this.refreshing = true
      if (!silent) this.loading = true
      try {
        const options = silent ? { silent: true } : {}
        const datasets = await fetchAllPages(fetchRegisteredDatasets, options, { query: this.formInline.name })
        if (version !== this.requestVersion) return
        this.TaskData = keepStableCollection(this.TaskData, datasets.map(dataset => datasetRow(dataset)))
        this.total = datasets.length
        this.currentPage = clampPage(this.currentPage, this.pageSize, this.total)
        this.lastUpdatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
        this.loadError = ''
      } catch (err) {
        if (version !== this.requestVersion) return
        this.loadError = `数据更新失败（保留上次结果）：${err.message}`
        console.error('获取数据集列表失败:', err)
        if (!silent) this.$message.error('获取数据集列表失败')
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
    },
    handleCurrentChange(val) {
      this.currentPage = val
    },
    handleSortChange({ prop, order }) {
      this.sort = { prop: prop || '', order: order || '' }
      this.currentPage = 1
    },
    handleEdit(index, row) {
      console.log(index, row)
      this.dialogVisibleYaml = true
      this.yamlKey = this.yamlKey + 1
      this.task_name = row.task_name
    },
    closeDialogYaml() {
      this.dialogVisibleYaml = false
    },
    checkFuncLogs(index, row) {
      console.log(index, row)
      this.dialogVisibleLogs = true
      this.logsKey = this.logsKey + 1
      this.task_name = row.task_name
    },
    closeDialogLogs() {
      this.dialogVisibleLogs = false
    },
    // openTaskDialog(task) {
    //   this.selectedTask = { ...task }; // 复制任务数据以防止修改时影响原数据
    //   this.dialogVisibleDetail = true;
    // },
    closeTaskDialog() {
      this.dialogVisibleDetail = false
      this.editing = false // 退出编辑模式
    },
    handleSelectionChange(selection) {
      this.selectedRows = selection
    },
    onSelectionChange(selection) {
      this.selectedRows = selection
    },
    formatBytes,
    resourceLabel(resources = {}) {
      return `CPU ${resources.cpu == null ? '-' : resources.cpu} 核 / 内存 ${resources.memoryGi == null ? '-' : resources.memoryGi} GiB / GPU ${resources.gpu == null ? '-' : resources.gpu}`
    },
    async loadRuntimeImages() {
      try {
        const r = await fetchRuntimeImages({ status: 'READY', pageSize: 100 })
        this.runtimeImages = (r.list || []).filter(image => image.enabled)
        const hashDemo = this.runtimeImages.find(image => image.name === 'hash-demo')
        this.selectedImageId = (hashDemo || this.runtimeImages[0] || {}).imageId || null
      } catch (e) {
        console.error('加载运行镜像列表失败:', e)
        this.runtimeImages = []
        this.selectedImageId = null
      }
    },
    submitSummary({ taskId, datasetCount }) {
      return `已创建任务 #${taskId}：${datasetCount} 个数据集，按分布式与集中式两种模式调度`
    },
    goToAnalysis() {
      if (!this.submitResult) return
      this.$router.push({ path: '/operations/analysis', query: { taskId: String(this.submitResult.taskId) }})
    },
    // 按模式分组列出未通过的检查项：先列两种模式共用的检查，再列 [分布式]、[集中式]。
    preflightFailureText(checks = []) {
      const failed = checks.filter(check => !check.available)
      const lines = []
      for (const mode of [null, 'IN_PLACE', 'CENTRALIZED']) {
        failed.filter(check => checkMode(check) === mode).forEach(check => {
          const detail = `${check.name || check.resourceId || check.resourceType}: ${check.message || check.status}`
          lines.push(mode ? `[${MODE_LABELS[mode]}] ${detail}` : detail)
        })
      }
      return lines.join('\n')
    },
    // 一次点击只建一个任务 ID（executionMode=COMPARISON）：所选的每个数据集都按分布式与集中式各调度一次。
    // 运行镜像默认指向 hash-demo（只对已落地的数据算一次哈希），避免计算时长掩盖数据移动耗时，
    // 但用户可以按需切换成任意已激活镜像。
    async handleSubmit() {
      if (this.submitting) return
      if (this.selectedRows.length === 0) {
        this.$message.warning('数据不能为空，请选择数据。')
        return
      }
      if (!this.selectedImageId) {
        this.$message.warning('请先选择运行镜像。')
        return
      }

      this.submitting = true
      const datasetIds = this.selectedRows.map(r => r.datasetId).sort((a, b) => a - b)
      const signature = JSON.stringify([datasetIds, this.selectedImageId])
      if (!this.pendingSubmission || this.pendingSubmission.signature !== signature) {
        const runId = `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        this.pendingSubmission = {
          signature,
          key: requestId(),
          body: {
            taskName: `对比任务-${runId}`,
            datasetIds,
            runtimeImageId: this.selectedImageId,
            executionMode: 'COMPARISON',
            acceptanceRunId: runId,
            runRound: 1
          }
        }
      }
      const { body, key } = this.pendingSubmission
      try {
        if (!this.pendingSubmission.attempted) {
          const preflight = await preflightRegisteredTask(body)
          const checks = (preflight && preflight.checks) || []
          if (checks.some(check => check.available !== true && check.errorCode === ACCESS_DENIED)) {
            this.pendingSubmission = null
            this.$message.error(ACCESS_DENIED_MESSAGE)
            return
          }
          if (!(preflight && preflight.valid)) {
            await this.$alert(this.preflightFailureText(checks), '任务预检查未通过', { customClass: 'preflight-message' })
            return
          }
        }
        this.pendingSubmission.attempted = true
        const task = await createRegisteredTask(body, key)
        this.pendingSubmission = null
        this.submitResult = { taskId: task.taskId, datasetCount: datasetIds.length }
        this.$message.success(this.submitSummary(this.submitResult))
        this.$refs.datasetTable.clearSelection()
        this.selectedRows = []
      } catch (e) {
        if (isAccessDenied(e)) {
          this.pendingSubmission = null
          this.$message.error(ACCESS_DENIED_MESSAGE)
          return
        }
        console.error('提交失败:', e)
        if (e !== 'cancel' && e !== 'close') this.$message.error((e && e.message) || '提交失败')
      } finally {
        this.submitting = false
      }
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
  min-height: 0;
  padding: 0px 16px 0px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.content-card {
  flex: 1;
  min-height: 0;
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
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0;
  gap: 8px;
  flex-wrap: wrap;
  background: transparent;
}
.live-refresh-anchor {
  margin-left: auto;
}
.search-container ::v-deep .el-form--inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.search-container ::v-deep .el-form--inline .el-form-item {
  margin: 0;
}
.search-container ::v-deep .el-form-item__content {
  line-height: 32px;
}
.search-container ::v-deep .el-input__inner {
  height: 32px;
  line-height: 32px;
}
.search-container ::v-deep .el-button {
  height: 32px;
  line-height: 1;
  padding: 0 16px;
  margin: 0;
}
.action-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.image-select {
  width: 200px;
}
.content-row {
  flex: 1;
  min-height: 0;
  overflow: auto;
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
  box-shadow: none;
  box-sizing: border-box;
}
.table-wrapper {
  width: 100%;
  overflow-x: auto;
}
.page-footer {
  flex-shrink: 0;
  padding: 8px 0;
  box-sizing: border-box;
  margin-top: 0;
}
.submit-bar {
  margin-top: 16px;
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
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
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
.page-size-note { color: #666; }
.search-input {
  width: 400px;      /* 控制长度 */
  height: 45px;      /* 控制高度 */
  font-size: 16px;   /* 控制文字大小 */
}
.page { padding: 16px; box-sizing: border-box; }

/* 弹窗内布局 */
.charts {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-detail-dialog .el-dialog__body {
  padding-bottom: 24px;  /* 自己调，比如 24~40px */
}
.page { padding-bottom: 16px; }
.submit-bar {
  margin-top: 16px;
  /* 如果希望按钮固定在底部，可用下面两行替代：
  position: sticky;
  bottom: 0;
  background: #fff;
  padding-top: 12px;
  */
}

</style>

<style>
/* 预检查弹窗挂在 body 上，scoped 样式覆盖不到；按行展示各模式的失败原因。 */
.preflight-message .el-message-box__message p {
  white-space: pre-line;
}
</style>
