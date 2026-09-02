<template>
  <div class="scheduling-logs-page">
    <section class="content-card">
      <div class="page-heading">
        <div>
          <h2>调度日志</h2>
          <p>查看数据调度计划及各数据分配项的执行结果。</p>
        </div>
        <el-button size="small" icon="el-icon-refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-form :inline="true" :model="filters" size="small" @submit.native.prevent="search">
        <el-form-item label="关键词">
          <el-input v-model="filters.query" clearable placeholder="计划 / 任务 ID / 算法名称" @keyup.enter.native="search" />
        </el-form-item>
        <el-form-item label="执行状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" @change="search">
            <el-option v-for="status in planStatuses" :key="status" :value="status" :label="statusLabel(status)" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-alert v-if="error" class="error-message" :title="error" type="error" :closable="false" show-icon />
      <el-table v-loading="loading" :data="plans" row-key="planId" empty-text="暂无数据调度记录">
        <el-table-column prop="planId" label="计划 ID" width="95" />
        <el-table-column prop="externalPlanId" label="外部计划 ID" min-width="180" show-overflow-tooltip />
        <el-table-column prop="taskId" label="外部任务 ID" min-width="135" show-overflow-tooltip />
        <el-table-column label="调度算法" min-width="160" show-overflow-tooltip>
          <template slot-scope="scope">{{ algorithmLabel(scope.row) }}</template>
        </el-table-column>
        <el-table-column label="执行状态" width="120">
          <template slot-scope="scope">
            <el-tag size="small" :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="175">
          <template slot-scope="scope">{{ formatTime(scope.row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="175">
          <template slot-scope="scope">{{ formatTime(scope.row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="失败原因" min-width="170" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="openDetail(scope.row)">执行详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="changeSize"
          @current-change="changePage"
        />
      </div>
    </section>

    <el-dialog title="数据调度执行详情" :visible.sync="detailVisible" width="90%" @close="closeDetail">
      <div v-loading="detailLoading" class="detail-content">
        <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" show-icon />
        <el-alert v-if="nameError" class="error-message" :title="nameError" type="warning" :closable="false" show-icon />
        <template v-if="detail">
          <dl class="plan-summary">
            <div><dt>外部计划 ID</dt><dd>{{ detail.plan.externalPlanId }}</dd></div>
            <div><dt>计划 ID</dt><dd>{{ detail.plan.planId }}</dd></div>
            <div><dt>外部任务 ID</dt><dd>{{ detail.plan.taskId }}</dd></div>
            <div><dt>内部任务 ID</dt><dd>{{ detail.plan.internalTaskId == null ? '—' : detail.plan.internalTaskId }}</dd></div>
            <div><dt>调度算法</dt><dd>{{ algorithmLabel(detail.plan) }}</dd></div>
            <div><dt>执行状态</dt><dd><el-tag size="small" :type="statusType(detail.plan.status)">{{ statusLabel(detail.plan.status) }}</el-tag></dd></div>
            <div><dt>提交时间</dt><dd>{{ formatTime(detail.plan.createdAt) }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatTime(detail.plan.updatedAt) }}</dd></div>
          </dl>
          <el-alert v-if="detail.plan.errorMessage" class="error-message" :title="detail.plan.errorMessage" type="error" :closable="false" show-icon />
          <h3>数据分配执行记录</h3>
          <el-table :data="detail.assignments" row-key="assignmentId" size="small" empty-text="暂无数据分配记录">
            <el-table-column label="数据集" min-width="210">
              <template slot-scope="scope">
                <div class="entity-name" :title="datasetName(scope.row.datasetId)">{{ datasetName(scope.row.datasetId) }}</div>
                <div class="entity-id">ID：{{ scope.row.datasetId }}</div>
              </template>
            </el-table-column>
            <el-table-column label="源节点" min-width="150">
              <template slot-scope="scope">
                <div class="entity-name" :title="nodeName(scope.row.sourceNodeId)">{{ nodeName(scope.row.sourceNodeId) }}</div>
                <div class="entity-id">ID：{{ scope.row.sourceNodeId }}</div>
              </template>
            </el-table-column>
            <el-table-column label="目标节点" min-width="150">
              <template slot-scope="scope">
                <div class="entity-name" :title="nodeName(scope.row.targetNodeId)">{{ nodeName(scope.row.targetNodeId) }}</div>
                <div class="entity-id">ID：{{ scope.row.targetNodeId }}</div>
              </template>
            </el-table-column>
            <el-table-column label="调度动作" min-width="140">
              <template slot-scope="scope">{{ actionLabel(scope.row.action) }}</template>
            </el-table-column>
            <el-table-column label="执行状态" width="110">
              <template slot-scope="scope">
                <el-tag size="small" :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" width="175">
              <template slot-scope="scope">{{ formatTime(scope.row.updatedAt) }}</template>
            </el-table-column>
            <el-table-column prop="assignmentId" label="分配 ID" width="90" />
            <el-table-column prop="replicaId" label="副本 ID" width="95" />
            <el-table-column label="失败原因" min-width="220">
              <template slot-scope="scope"><span class="failure-reason">{{ scope.row.errorMessage || '—' }}</span></template>
            </el-table-column>
          </el-table>
        </template>
      </div>
      <span slot="footer">
        <el-button :loading="detailLoading" @click="loadDetail">刷新详情</el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </div>
</template>

<script>
import { fetchSchedulingPlans, fetchSchedulingPlan } from '@/api/schedulingApi'
import { fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { fetchAllPages } from '@/utils/dataset-catalog'

const statusLabels = { ACCEPTED: '已接收', PENDING: '待执行', RUNNING: '执行中', COMPLETED: '已完成', PARTIAL_COMPLETED: '失败', FAILED: '失败' }
const statusTypes = { ACCEPTED: 'info', PENDING: 'info', RUNNING: '', COMPLETED: 'success', PARTIAL_COMPLETED: 'danger', FAILED: 'danger' }
const actionLabels = { COPY: '复制数据', MOVE: '迁移数据', USE_IN_PLACE: '原位使用', COPY_AND_USE: '复制后使用', MOVE_AND_USE: '迁移后使用', REMOTE_READ: '远程读取' }

export default {
  name: 'SchedulingLogs',
  data() {
    return {
      filters: { query: '', status: '' },
      planStatuses: ['ACCEPTED', 'RUNNING', 'COMPLETED', 'FAILED'],
      page: 1,
      pageSize: 10,
      plans: [],
      total: 0,
      loading: false,
      error: '',
      listRequest: 0,
      detailVisible: false,
      detailLoading: false,
      detailError: '',
      nameError: '',
      datasetNames: {},
      nodeNames: {},
      selectedPlanId: null,
      detail: null,
      detailRequest: 0
    }
  },
  created() { this.load() },
  beforeDestroy() {
    this.listRequest++
    this.detailRequest++
  },
  methods: {
    statusLabel(status) { return statusLabels[status] || status || '—' },
    statusType(status) { return statusTypes[status] || '' },
    actionLabel(action) { return actionLabels[action] || action || '—' },
    algorithmLabel(plan) { return [plan.algorithmName, plan.algorithmVersion].filter(Boolean).join(' / ') || '—' },
    formatTime(value) { return value ? String(value).replace('T', ' ').replace(/\.\d+$/, '') : '—' },
    datasetName(id) { return this.datasetNames[id] || '名称未找到' },
    nodeName(id) { return this.nodeNames[id] || '名称未找到' },
    async load() {
      const request = ++this.listRequest
      this.loading = true
      this.error = ''
      try {
        const result = await fetchSchedulingPlans({ page: this.page, pageSize: this.pageSize, query: this.filters.query.trim(), status: this.filters.status })
        if (request !== this.listRequest) return
        this.plans = result.list
        this.total = result.total
      } catch (error) {
        if (request !== this.listRequest) return
        this.plans = []
        this.total = 0
        this.error = `调度日志加载失败：${error.message}`
      } finally {
        if (request === this.listRequest) this.loading = false
      }
    },
    search() {
      this.page = 1
      return this.load()
    },
    reset() {
      this.filters = { query: '', status: '' }
      return this.search()
    },
    changePage(page) {
      this.page = page
      return this.load()
    },
    changeSize(size) {
      this.pageSize = size
      return this.search()
    },
    openDetail(plan) {
      this.selectedPlanId = plan.planId
      this.detail = null
      this.datasetNames = {}
      this.nodeNames = {}
      this.detailVisible = true
      return this.loadDetail()
    },
    async loadDetail() {
      const request = ++this.detailRequest
      this.detailLoading = true
      this.detailError = ''
      this.nameError = ''
      try {
        const [detail, datasets, nodes] = await Promise.all([
          fetchSchedulingPlan(this.selectedPlanId),
          fetchAllPages(fetchRegisteredDatasets, { silent: true }).catch(() => null),
          fetchAllPages(fetchRegisteredNodes, { silent: true }).catch(() => null)
        ])
        if (request !== this.detailRequest) return
        this.detail = detail
        this.datasetNames = (datasets || []).reduce((names, dataset) => {
          names[dataset.datasetId] = dataset.name
          return names
        }, {})
        this.nodeNames = (nodes || []).reduce((names, node) => {
          names[node.nodeId] = node.displayName || node.k8sNodeName
          return names
        }, {})
        const unavailable = [datasets === null && '数据集', nodes === null && '节点'].filter(Boolean)
        this.nameError = unavailable.length ? `${unavailable.join('、')}名称加载失败，未匹配的记录仍可通过 ID 核对；请刷新详情重试。` : ''
      } catch (error) {
        if (request === this.detailRequest) {
          this.detail = null
          this.detailError = `执行详情加载失败：${error.message}`
        }
      } finally {
        if (request === this.detailRequest) this.detailLoading = false
      }
    },
    closeDetail() {
      this.detailRequest++
      this.detail = null
      this.detailLoading = false
      this.nameError = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.scheduling-logs-page { padding: 20px 24px 0; color: #303133; }
.content-card { background: #fff; border-radius: 8px; padding: 24px; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
.page-heading p { margin: 0; color: #909399; font-size: 13px; }
.el-input { width: 250px; }
.el-select { width: 160px; }
.error-message { margin-bottom: 16px; }
.pagination-container { margin-top: 24px; overflow-x: auto; text-align: right; }
.detail-content { min-height: 160px; }
.plan-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; padding: 20px; background: #f7f8fa; border-radius: 6px; }
dt { font-size: 12px; color: #909399; margin-bottom: 8px; }
dd { margin: 0; overflow-wrap: anywhere; }
h3 { font-size: 15px; margin: 24px 0 16px; }
.failure-reason { white-space: pre-wrap; overflow-wrap: anywhere; }
.entity-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entity-id { color: #909399; font-size: 12px; }
.copyright-bar { padding: 20px 0 12px; text-align: center; color: #909399; font-size: 12px; }
@media (max-width: 900px) {
  .scheduling-logs-page { padding: 12px; }
  .content-card { padding: 16px; }
  .plan-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
