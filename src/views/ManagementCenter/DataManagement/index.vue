<!-- 数据集信息与注册中心共用逻辑数据集目录 -->
<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div class="content-card">
        <div class="search-container">
          <el-form :inline="true" :model="formInline" size="medium" @submit.native.prevent="onSearch">
            <el-form-item>
              <el-input v-model="formInline.name" clearable placeholder="请输入数据集名称 / 编码" @keyup.enter.native="onSearch" />
            </el-form-item>
            <el-button @click="onSearch">搜索</el-button>
            <el-button @click="onCancel">重置</el-button>
          </el-form>
          <div class="action-buttons">
            <el-button type="primary" :loading="heatLoading" @click="onUpdateHeatAll">热度全部更新</el-button>
            <el-tooltip :disabled="!!storagePolicy.heatEnabled" :content="storagePolicy.heatReason || policyError || '正在加载存储策略'" placement="top">
              <span><el-button type="primary" :disabled="heatLoading || !storagePolicy.heatEnabled" @click="openStoragePlan()">热敏存储</el-button></span>
            </el-tooltip>
            <el-button :loading="loading" @click="fetchData()">刷新</el-button>
            <el-button type="primary" @click="$router.push('/resources/datasets/register')">数据集注册</el-button>
          </div>
          <live-refresh-status class="live-refresh-anchor" :updated-at="lastUpdatedAt" />
        </div>
        <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
        <el-alert v-if="policyError" :title="policyError" type="warning" :closable="false" show-icon />
        <el-alert v-if="nodeNameError && !dialogVisibleDetail" :title="nodeNameError" type="warning" :closable="false" show-icon />

        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table v-loading="loading" class="my-table" :data="currentPageData" row-key="datasetId" style="width: 100%;" @sort-change="handleSortChange">
                <el-table-column prop="datasetId" label="ID" width="70" align="center" />
                <el-table-column prop="name" label="数据名称" min-width="160" show-overflow-tooltip />
                <el-table-column prop="dataHeat" label="热度" width="100" align="center" sortable="custom">
                  <template slot-scope="scope">{{ formatHeat(scope.row.dataHeat) }}</template>
                </el-table-column>
                <el-table-column prop="datasetCode" label="编码" min-width="160" show-overflow-tooltip />
                <el-table-column prop="version" label="版本" width="80" align="center" />
                <el-table-column prop="fileType" label="类型" width="80" align="center" />
                <el-table-column label="大小" width="115" align="center">
                  <template slot-scope="scope">{{ formatBytes(scope.row.dataSize) }}</template>
                </el-table-column>
                <el-table-column prop="status" label="注册状态" width="130" align="center" />
                <el-table-column label="可用副本" width="100" align="center">
                  <template slot-scope="scope">{{ scope.row.availableReplicaCount }}/{{ scope.row.totalReplicaCount }}</template>
                </el-table-column>
                <el-table-column label="存储节点" min-width="140" show-overflow-tooltip>
                  <template slot-scope="scope">{{ storageNodes(scope.row) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="180" align="center" fixed="right">
                  <template slot-scope="scope">
                    <el-button type="text" class="link-btn" @click="openTaskDialog(scope.row)">详情</el-button>
                    <el-tooltip :disabled="canSchedule(scope.row)" content="仅已激活且有可用副本的数据集可以调度" placement="top">
                      <span><el-button type="text" class="link-btn" :disabled="!canSchedule(scope.row)" @click="openScheduleDialog(scope.row)">调度</el-button></span>
                    </el-tooltip>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>

        <el-dialog title="数据集详情" :visible.sync="dialogVisibleDetail" width="80%" custom-class="node-detail-dialog">
          <el-form label-width="100px">
            <el-form-item label="数据集 ID">{{ selectedTask.datasetId }}</el-form-item>
            <el-form-item label="编码 / 版本">{{ selectedTask.datasetCode }} / {{ selectedTask.version }}</el-form-item>
            <el-form-item label="数据名称">{{ selectedTask.name }}</el-form-item>
            <el-form-item label="描述">{{ selectedTask.description || '暂无描述' }}</el-form-item>
            <el-form-item label="大小">{{ formatBytes(selectedTask.dataSize) }}</el-form-item>
            <el-form-item label="热度">{{ formatHeat(selectedTask.dataHeat) }}</el-form-item>
            <el-form-item label="热度更新时间">{{ selectedTask.heatUpdatedAt ? new Date(selectedTask.heatUpdatedAt).toLocaleString('zh-CN', { hour12: false }) : '暂无数据' }}</el-form-item>
            <el-form-item label="注册状态">{{ selectedTask.status }}</el-form-item>
          </el-form>
          <el-alert v-if="nodeNameError" :title="nodeNameError" type="warning" :closable="false" show-icon />
          <div class="replica-toolbar">
            <el-button size="mini" :loading="reverifyLoading" @click="onReverify">重新校验</el-button>
            <el-button size="mini" @click="openAddReplica">从候选添加副本</el-button>
            <el-button
              size="mini"
              type="danger"
              plain
              :loading="removeReplicaLoading"
              :disabled="!selectedReplicaIds.length"
              @click="onRemoveReplicas"
            >删除选定副本</el-button>
          </div>
          <el-table
            ref="replicaTable"
            :data="selectedTask.replicas || []"
            row-key="replicaId"
            empty-text="暂无副本"
            :row-class-name="replicaRowClass"
            @selection-change="onReplicaSelectionChange"
          >
            <el-table-column type="selection" width="45" :selectable="() => !removeReplicaLoading" />
            <el-table-column prop="replicaId" label="副本 ID" width="90" />
            <el-table-column label="节点名称" min-width="150" show-overflow-tooltip>
              <template slot-scope="scope"><span :title="`节点 ID：${scope.row.nodeId}`">{{ nodeName(scope.row.nodeId) }}</span></template>
            </el-table-column>
            <el-table-column prop="filePath" label="文件路径" min-width="220" show-overflow-tooltip />
            <el-table-column label="大小" width="100"><template slot-scope="scope">{{ formatBytes(scope.row.sizeBytes) }}</template></el-table-column>
            <el-table-column prop="effectiveAvailability" label="可用性" width="120" />
            <el-table-column label="原因 / 校验信息" min-width="220" show-overflow-tooltip>
              <template slot-scope="scope">{{ scope.row.statusReason || scope.row.verificationMessage || '—' }}</template>
            </el-table-column>
            <el-table-column label="最近校验时间" width="160">
              <template slot-scope="scope">{{ scope.row.verifiedAt ? new Date(scope.row.verifiedAt).toLocaleString('zh-CN', { hour12: false }) : '尚未校验' }}</template>
            </el-table-column>
          </el-table>
          <span slot="footer">
            <el-button type="primary" :disabled="!canSchedule(selectedTask)" @click="$refs.accessTest.open(selectedTask)">访问性能对照</el-button>
            <el-button @click="dialogVisibleDetail = false">关闭</el-button>
          </span>
        </el-dialog>

        <el-dialog title="从候选文件添加副本" :visible.sync="addReplicaDialog" width="520px">
          <el-input v-model="candidateQuery" placeholder="按文件名 / 路径搜索候选文件" clearable
                    @input="loadCandidates" style="margin-bottom: 12px;" />
          <el-table v-loading="candidatesLoading" :data="unregisteredCandidates" max-height="320"
                    empty-text="没有未注册的候选文件">
            <el-table-column prop="candidateId" label="ID" width="70" />
            <el-table-column label="节点" min-width="120">
              <template slot-scope="scope">{{ nodeName(scope.row.nodeId) }}</template>
            </el-table-column>
            <el-table-column prop="filePath" label="路径" min-width="220" show-overflow-tooltip />
            <el-table-column label="操作" width="90">
              <template slot-scope="scope">
                <el-button type="text" :loading="addReplicaLoading === scope.row.candidateId"
                           @click="onAddReplica(scope.row)">添加</el-button>
              </template>
            </el-table-column>
          </el-table>
          <span slot="footer"><el-button @click="addReplicaDialog = false">关闭</el-button></span>
        </el-dialog>

        <manual-schedule-dialog ref="manualSchedule" @submitted="fetchData()" />
        <storage-plan-dialog ref="storagePlan" @submitted="fetchData()" />
        <access-test-dialog ref="accessTest" @completed="fetchData()" />

        <div class="page-footer">
          <div class="pagination-container">
            <span class="pagination-total">共 {{ total }} 条</span>
            <span class="pagination-sizes-label">每页</span>
            <el-select v-model="pageSize" size="mini" class="pagination-sizes-select" @change="handleSizeChange">
              <el-option v-for="size in [5, 10, 20, 50]" :key="size" :value="size" :label="String(size)" />
            </el-select>
            <span class="pagination-sizes-label">条</span>
            <el-pagination :current-page="currentPage" :page-size="pageSize" layout="prev, pager, next, jumper" :total="total" @current-change="handleCurrentChange" />
          </div>
        </div>
      </div>
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import LiveRefreshStatus from '@/components/LiveRefreshStatus'
import ManualScheduleDialog from './ManualScheduleDialog'
import StoragePlanDialog from './StoragePlanDialog'
import AccessTestDialog from './AccessTestDialog'
import { keepStableCollection } from '@/utils/live-refresh'
import { clampPage, datasetRow, fetchAllPages, formatBytes, formatHeat, paginateRows, sortRows } from '@/utils/dataset-catalog'
import { addDatasetReplica, fetchDatasetCandidates, fetchRegisteredDatasets, fetchRegisteredNodes, removeDatasetReplica, verifyDataset } from '@/api/registrationApi'
import { fetchStoragePolicy, refreshDatasetHeat } from '@/api/datasetStorageApi'

export default {
  name: 'DataManagement',
  components: { LiveRefreshStatus, ManualScheduleDialog, StoragePlanDialog, AccessTestDialog },
  data() {
    return {
      currentPage: 1,
      pageSize: 10,
      dialogVisibleDetail: false,
      loading: false,
      refreshing: false,
      requestVersion: 0,
      refreshTimer: null,
      lastUpdatedAt: '',
      loadError: '',
      policyError: '',
      storagePolicy: {},
      heatLoading: false,
      total: 0,
      sort: { prop: '', order: '' },
      formInline: { name: '' },
      TaskData: [],
      selectedTask: {},
      nodeNames: {},
      nodeNameError: '',
      nodeNamesLoading: false,
      nodeNameRequest: 0,
      reverifyLoading: false,
      addReplicaDialog: false,
      candidateQuery: '',
      candidatesLoading: false,
      candidates: [],
      addReplicaLoading: null,
      selectedReplicaIds: [],
      removeReplicaLoading: false
    }
  },
  computed: {
    currentPageData() {
      return paginateRows(sortRows(this.TaskData, this.sort), this.currentPage, this.pageSize)
    },
    unregisteredCandidates() {
      return this.candidates.filter(candidate => !candidate.registeredDatasetId)
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    this.refreshTimer = window.setInterval(() => this.fetchData(true), 1000)
  },
  beforeDestroy() {
    window.clearInterval(this.refreshTimer)
    this.requestVersion++
    this.nodeNameRequest++
  },
  methods: {
    formatBytes,
    formatHeat,
    async onUpdateHeatAll() {
      if (this.heatLoading) return
      this.heatLoading = true
      try {
        const result = await refreshDatasetHeat()
        this.$message.success(`已更新 ${result.updatedCount} 个数据集的热度`)
        await this.fetchData()
      } catch (error) {
        this.$message.error(`热度更新失败：${error.message}`)
      } finally {
        this.heatLoading = false
      }
    },
    openStoragePlan() {
      if (!this.heatLoading && this.storagePolicy.heatEnabled) this.$refs.storagePlan.open()
    },
    nonMissingReplicas(dataset) {
      return (dataset.replicas || []).filter(replica => replica.availability !== 'MISSING' && replica.effectiveAvailability !== 'MISSING')
    },
    storageNodes(dataset) {
      const ids = [...new Set(this.nonMissingReplicas(dataset).map(replica => replica.nodeId))]
      return ids.map(id => this.nodeName(id)).join('、') || '暂无副本'
    },
    nodeName(nodeId) {
      return this.nodeNames[nodeId] || (this.nodeNamesLoading ? '名称加载中…' : `节点 #${nodeId}（名称未找到）`)
    },
    async fetchData(silent = false) {
      if (silent && this.refreshing) return
      const version = ++this.requestVersion
      this.refreshing = true
      if (!silent) this.loading = true
      // Refresh names on entry/manual refresh, without blocking the dataset list
      // or requesting the node catalog on every one-second background poll.
      if (!silent) this.loadNodeNames()
      try {
        const options = silent ? { silent: true } : {}
        const [datasets, policy] = await Promise.all([
          fetchAllPages(fetchRegisteredDatasets, options, { query: this.formInline.name }),
          fetchStoragePolicy({ silent: true }).catch(error => ({ error }))
        ])
        if (version !== this.requestVersion) return
        this.storagePolicy = policy.error ? {} : policy
        this.policyError = policy.error ? `批量存储暂不可用：${policy.error.message}` : ''
        this.TaskData = keepStableCollection(this.TaskData, datasets.map(dataset => datasetRow(dataset)))
        this.total = datasets.length
        this.currentPage = clampPage(this.currentPage, this.pageSize, this.total)
        if (this.dialogVisibleDetail) {
          const selected = this.TaskData.find(dataset => dataset.datasetId === this.selectedTask.datasetId)
          if (selected) this.selectedTask = selected
          else this.dialogVisibleDetail = false
        }
        this.lastUpdatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
        this.loadError = ''
      } catch (err) {
        if (version !== this.requestVersion) return
        this.loadError = `数据更新失败（保留上次结果）：${err.message}`
        if (!silent) this.$message.error(err.message || '获取数据集列表失败')
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
    openTaskDialog(dataset) {
      if (dataset.datasetId !== this.selectedTask.datasetId) this.clearReplicaSelection()
      this.selectedTask = dataset
      this.dialogVisibleDetail = true
      return this.loadNodeNames()
    },
    async loadNodeNames() {
      const request = ++this.nodeNameRequest
      this.nodeNamesLoading = true
      this.nodeNameError = ''
      try {
        const nodes = await fetchAllPages(fetchRegisteredNodes, { silent: true })
        if (request !== this.nodeNameRequest) return
        this.nodeNames = nodes.reduce((names, node) => {
          names[node.nodeId] = node.displayName || node.k8sNodeName
          return names
        }, {})
      } catch (error) {
        if (request === this.nodeNameRequest) this.nodeNameError = '节点名称加载失败，保留已加载的名称；未匹配的节点暂用 ID，可点击刷新重试。'
      } finally {
        if (request === this.nodeNameRequest) this.nodeNamesLoading = false
      }
    },
    canSchedule(dataset) {
      return dataset.status === 'ACTIVE' && dataset.availableReplicaCount > 0
    },
    openScheduleDialog(dataset) {
      if (this.canSchedule(dataset)) this.$refs.manualSchedule.open(dataset)
    },
    replicaRowClass({ row }) {
      return row.availability === 'MISSING' || row.effectiveAvailability === 'MISSING' ? 'replica-row-missing' : ''
    },
    async onReverify() {
      if (this.reverifyLoading) return
      this.reverifyLoading = true
      try {
        await verifyDataset(this.selectedTask.datasetId)
        this.$message.success('已重新发起校验')
        await this.fetchData()
      } catch (error) {
        this.$message.error(`重新校验失败：${error.message}`)
      } finally {
        this.reverifyLoading = false
      }
    },
    openAddReplica() {
      this.candidateQuery = ''
      this.addReplicaDialog = true
      this.loadCandidates()
    },
    async loadCandidates() {
      this.candidatesLoading = true
      try {
        const result = await fetchDatasetCandidates({ page: 1, pageSize: 100, query: this.candidateQuery })
        this.candidates = result.list || []
      } catch (error) {
        this.$message.error(`候选文件加载失败：${error.message}`)
      } finally {
        this.candidatesLoading = false
      }
    },
    onReplicaSelectionChange(rows) {
      this.selectedReplicaIds = rows.map(row => row.replicaId)
    },
    clearReplicaSelection() {
      this.selectedReplicaIds = []
      if (this.$refs.replicaTable) this.$refs.replicaTable.clearSelection()
    },
    async onRemoveReplicas() {
      if (this.removeReplicaLoading) return
      const dataset = this.selectedTask
      const replicas = (dataset.replicas || []).filter(replica => this.selectedReplicaIds.includes(replica.replicaId))
      if (!replicas.length) return
      const usable = (dataset.replicas || []).filter(replica => replica.effectiveAvailability === 'USABLE')
      if (usable.length && usable.every(replica => this.selectedReplicaIds.includes(replica.replicaId))) {
        this.$message.error('不能删除数据集最后一个可用副本，请至少保留一个可用副本')
        return
      }
      const list = replicas.map(replica => `${this.nodeName(replica.nodeId)}：${replica.filePath}`).join('；')
      try {
        await this.$confirm(`将删除 ${replicas.length} 个副本（${list}）。节点上的文件会被一并删除，无法恢复。`,
          '删除副本', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
      } catch (cancelled) {
        return
      }
      this.removeReplicaLoading = true
      const failures = []
      try {
        // One at a time: the server holds the dataset lock per deletion and re-checks
        // that a usable replica remains, so parallel requests would only race each other.
        for (const replica of replicas) {
          try {
            await removeDatasetReplica(dataset.datasetId, replica.replicaId)
          } catch (error) {
            failures.push(`副本 ${replica.replicaId}：${error.message}`)
          }
        }
      } finally {
        this.removeReplicaLoading = false
      }
      const removed = replicas.length - failures.length
      if (failures.length) this.$message.error(`已删除 ${removed} 个副本，${failures.length} 个失败：${failures.join('；')}`)
      else this.$message.success(`已删除 ${removed} 个副本`)
      this.clearReplicaSelection()
      await this.fetchData()
    },
    async onAddReplica(candidate) {
      this.addReplicaLoading = candidate.candidateId
      try {
        await addDatasetReplica(this.selectedTask.datasetId, candidate.candidateId)
        this.$message.success('已添加副本')
        this.addReplicaDialog = false
        await this.fetchData()
      } catch (error) {
        this.$message.error(`添加副本失败：${error.message}`)
      } finally {
        this.addReplicaLoading = null
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
  flex-wrap: wrap;
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
.replica-toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}
</style>
<style>
.replica-row-missing {
  color: #c0c4cc;
  background: #fafafa;
}
</style>
