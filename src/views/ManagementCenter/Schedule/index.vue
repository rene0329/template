<!--节点管理模块-->
<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div class="content-card">
        <div class="search-container">
          <el-form :inline="true" :model="formInline" size="medium">
            <el-form-item>
              <el-input v-model="formInline.name" placeholder="请输入任务ID或任务名称" />
            </el-form-item>
            <el-button @click="onSearch">搜索</el-button>
            <el-button @click="onCancel">重置</el-button>
          </el-form>
        </div>
        <!--<div style="margin-bottom: 15px">
          <el-button type="primary" icon="el-icon-plus">新建</el-button>
          <el-button type="info" @click="onRefresh">刷新</el-button>
          <el-button icon="el-icon-edit el-icon--left">批量操作</el-button>
          <el-button style="width:110px">更多操作&nbsp;<i class="el-icon-bottom el-icon--left" /></el-button>
        </div>-->
        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table
                class="my-table"
                :data="currentPageData"
                style="width: 100%;"
                :default-sort="{prop: 'taskId', order: 'ascending'}"
                @sort-change="handleSortChange"
              >
                <el-table-column
                  prop="taskId"
                  label="任务ID"
                  :min-width="180"
                  sortable="custom"
                  align="center"
                />
                <el-table-column
                  prop="schedule"
                  label="调度方案"
                  :min-width="420"
                  align="center"
                >
                  <template slot-scope="scope">
                    <div class="schedule-cell">
                      <template v-if="scope.row.parsedSchedule.kind !== 'raw'">
                        <div v-for="(section, index) in scope.row.parsedSchedule.sections" :key="index" class="schedule-section">
                          <div class="schedule-title">{{ section.title }}</div>
                          <div v-for="(line, lineIndex) in section.lines" :key="lineIndex" class="schedule-line" :class="{ 'is-failed': scheduleLineFailed(line) }">{{ line }}</div>
                          <div v-if="!section.lines.length" class="schedule-line is-empty">暂无</div>
                        </div>
                      </template>
                      <div v-else class="schedule-raw">{{ scope.row.parsedSchedule.text || '—' }}</div>
                    </div>
                  </template>
                </el-table-column>

                <!--el-table-column
                  prop="task_app_id"
                  label="应用绑定"
                  width="120"
                />-->
                <el-table-column
                  prop="createTime"
                  label="创建时间"
                  width="200"
                  sortable="custom"
                />

              </el-table>
            </div>
          </div>
        </div>

        <div class="page-footer">
          <div class="pagination-container">
            <span class="pagination-total">共 {{ filteredDataCount }} 条</span>
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
import { fetchScheduleList } from '@/api/managementCenterApi'
import { clampPage, fetchAllPages, paginateRows, sortRows } from '@/utils/dataset-catalog'
import { parseSchedule, scheduleLineFailed } from '@/utils/schedule-text'

export default {
  name: 'NodeList',
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      loading: false,
      total: 0,
      sort: { prop: 'taskId', order: 'ascending' },
      // 用于表单搜索
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      TaskData: []
    }
  },
  computed: {
    filteredDataCount() {
      return this.total
    },
    currentPageData() {
      return paginateRows(sortRows(this.TaskData, this.sort), this.currentPage, this.pageSize)
    }
  },
  created() {
    const taskId = this.$route && this.$route.query && this.$route.query.taskId
    if (taskId) this.formInline.name = String(taskId)
    this.fetchData()
  },

  methods: {
    scheduleLineFailed,
    async fetchData() {
      this.loading = true
      try {
        // 后端 query 只匹配任务名称；这里取全量后在前端按任务ID（精确）或任务名称（包含）过滤。
        const tasks = await fetchAllPages(
          ({ page, pageSize, query }) => fetchScheduleList(page, pageSize, query),
          {},
          { query: '' }
        )
        const keyword = this.formInline.name.trim()
        this.TaskData = tasks
          .filter(task => !keyword || String(task.taskId) === keyword || String(task.taskName || '').includes(keyword))
          .map(task => ({ ...task, parsedSchedule: parseSchedule(task.schedule) }))
        this.total = this.TaskData.length
        this.currentPage = clampPage(this.currentPage, this.pageSize, this.total)
      } catch (err) {
        console.error('获取调度列表失败:', err)
        this.$message.error('获取调度列表失败')
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
  box-shadow: none;
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
.schedule-cell {
  display: inline-block;
  text-align: left;
  line-height: 1.7;
  padding: 10px 0;
  white-space: normal;
}
.schedule-section + .schedule-section {
  margin-top: 8px;
}
.schedule-title {
  color: #253747;
  font-weight: 600;
}
.schedule-line {
  padding-left: 12px;
  color: #606266;
  word-break: break-all;
}
.schedule-line.is-failed {
  color: #f56c6c;
}
.schedule-line.is-empty {
  color: #909399;
}
.schedule-raw {
  white-space: pre-wrap;
  word-break: break-all;
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

</style>
