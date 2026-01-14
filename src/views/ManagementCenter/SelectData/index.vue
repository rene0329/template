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
            <el-button type="primary" @click="handleSubmit" :disabled="selectedRows.length === 0">新建任务</el-button>
          </div>
        </div>
        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table
                class="my-table"
                :data="currentPageData"
                style="width: 100%;"
                :default-sort="{prop: 'id', order: 'upward'}"
                row-key="dataset_id"
                @selection-change="handleSelectionChange"
              >
                <el-table-column
                  type="selection"
                  width="55"
                  align="center"
                />
                <el-table-column
                  prop="dataset_id"
                  label="编号"
                  :min-width="80"
                  sortable
                  align="center"
                />
                <el-table-column
                  prop="dataset_name"
                  label="数据集名称"
                  :min-width="150"
                  align="center"
                />
                <el-table-column
                  prop="dataset_description"
                  label="数据集描述"
                  sortable
                  :min-width="520"
                  align="center"
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
import { fetchDatasetList, submitSelectedDatasets } from '@/api/managementCenterApi'
import * as echarts from 'echarts'

export default {
  name: 'NodeList',
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleLogs: false,
      logsKey: 0,
      selected: null,
      //currentPageData: [],
      selectedRows: [],
      systemName: '可选数据',
      headerRightText: '欢迎使用',
      loading: false,
      total: 0,
      // 用于表单搜索
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      TaskData: [],
      // 用于传递参数
      dataset_name: '',
      selectedTask: {}, // 存储选中的任务数据
      editing: false,   // 是否处于编辑模式
      rules: {
        // 表单校验规则
      }
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

  mounted() {
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await fetchDatasetList(this.currentPage, this.pageSize, this.formInline.name)
        this.TaskData = res.list || []
        this.total = res.total || this.TaskData.length
      } catch (err) {
        console.error('获取数据集列表失败:', err)
        this.$message.error('获取数据集列表失败')
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
      this.dialogVisibleDetail = false;
      this.editing = false; // 退出编辑模式
    },
    handleSelectionChange(selection) {
      this.selectedRows = selection
    },
    onSelectionChange(selection) {
      this.selectedRows = selection
    },
    async handleSubmit() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('数据不能为空，请选择数据。')
        return
      }

      const datasetIds = this.selectedRows.map(r => r.dataset_id)

      try {
        await submitSelectedDatasets(datasetIds)
        this.$message.success('提交成功')
        this.selectedRows = []
      } catch (e) {
        console.error('提交失败:', e)
        this.$message.error('提交失败，请稍后重试')
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
  box-shadow: none;
  box-sizing: border-box;
}
.table-wrapper { 
  width: 100%; 
  overflow-x: auto; 
}
.page-footer { 
  padding: 16px 0; 
  box-sizing: border-box;
  margin-top: 16px;
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
