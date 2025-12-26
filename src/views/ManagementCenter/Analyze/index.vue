<!--性能分析模块-->
<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div class="content-card">
        <div class="search-container">
          <el-form :inline="true" :model="formInline" size="medium">
            <el-form-item>
              <el-input v-model="formInline.name" placeholder="请输入任务ID" />
            </el-form-item>
            <el-button @click="onSearch">搜索</el-button>
            <el-button @click="onCancel">重置</el-button>
          </el-form>
        </div>

        <div class="content-row">
          <div class="table-card">
            <div class="table-wrapper">
              <el-table
                :data="currentPageData"
                style="width: 100%;"
              >
                <el-table-column
                  prop="task_id"
                  label="任务ID"
                  :min-width="120"
                  sortable
                  align="center"
                />
                <el-table-column
                  prop="centralized_time"
                  label="集中式计算数据移动时间/毫秒"
                  :min-width="200"
                  sortable
                  align="center"
                />
                <el-table-column
                  prop="distributed_time"
                  label="分布式计算数据移动时间/毫秒"
                  :min-width="200"
                  sortable
                  align="center"
                />
                <el-table-column
                  prop="acceleration_ratio"
                  label="数据移动加速比"
                  :min-width="150"
                  sortable
                  align="center"
                />
              </el-table>
            </div>
          </div>
        </div>

        <div class="page-footer">
          <div class="pagination-container">
            <el-pagination
              :current-page="currentPage"
              :page-size="pageSize"
              :page-sizes="[5, 10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @current-change="handleCurrentChange"
              @pagination="handleSizeChange"
            />
          </div>
        </div>
      </div>
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import { fetchAnalysisData } from '@/api/managementCenterApi'

export default {
  name: 'Analyze',
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      loading: false,
      total: 0,
      formInline: {
        name: ''
      },
      // 从服务器获取的数据
      analysisData: []
    }
  },
  computed: {
    currentPageData() {
      return this.analysisData
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await fetchAnalysisData(this.currentPage, this.pageSize, this.formInline.name)
        this.analysisData = res.data || res.result || []
        this.total = res.total || this.analysisData.length
      } catch (err) {
        console.error('获取分析数据失败:', err)
        this.$message.error('获取分析数据失败')
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
    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchData()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchData()
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
.search-container :deep(.el-form--inline .el-form-item) {
  margin-right: 8px;
  margin-bottom: 0;
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
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
:deep(.el-table__header th) {
  background: #f5f7fa;
  color: #333333;
  font-weight: 600;
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
</style>
