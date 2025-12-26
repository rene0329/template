<template>
  <el-container>
    <el-header style="margin-top:15px;height: 15px">
      当前正在执行的任务
    </el-header>
    <el-main>
      <el-form :inline="true" :model="formInline" class="demo-form-inline" size="medium">
        <el-form-item label="任务名称" size="medium">
          <el-input v-model="formInline.name" placeholder="请输入" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onCancel">取消</el-button>
        </el-form-item>
      </el-form>
      <div style="margin-bottom: 15px">
        <el-button type="primary" icon="el-icon-plus">新建</el-button>
        <el-button type="info" @click="onRefresh">刷新</el-button>
        <el-button icon="el-icon-edit el-icon--left">批量操作</el-button>
        <el-button style="width:110px">更多操作&nbsp;<i class="el-icon-bottom el-icon--left" /></el-button>
      </div>
      <el-table
        :data="currentPageData"
        style="width: 100%"
        :default-sort="{prop: 'task_id', order: 'upward'}"
      >
        <el-table-column
          type="selection"
          width="55"
        />
        <el-table-column
          prop="task_id"
          label="编号"
          width="100"
          sortable
        />
        <el-table-column
          prop="task_name"
          label="任务名称"
          width="150"
        />
        <el-table-column
          prop="task_type"
          label="任务类型"
          sortable
          width="100"
        />
        <el-table-column
          prop="task_desc"
          label="任务描述"
          width="250"
        />
        <el-table-column
          prop="task_author"
          label="任务作者"
          width="100"
        />
        <el-table-column
          prop="task_model_id"
          label="模型绑定"
          width="120"
        />

        <el-table-column
          prop="task_create_time"
          label="创建时间"
          width="250"
          sortable
          :formatter="formatter"
        />
        <el-table-column label="操作" width="100">
          <template slot-scope="scope">
            <div style="display: flex;">
              <el-button  type="text" size="middle" @click="openTaskDialog(scope.row)">查看日志</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <!-- 对话框 -->
      <el-dialog title="执行日志详情" :visible="dialogVisible" @close="closeTaskDialog">
        <el-form :model="selectedTask" :rules="rules" ref="taskForm">

          <!-- 其他字段 -->

          <el-form-item label="执行日志">
            <el-input type="textarea" v-model="selectedTask.task_logs" rows="10" :disabled="true"></el-input>
          </el-form-item>

        </el-form>

      </el-dialog>
    </el-main>
    <el-footer>
      <div class="block" style="text-align: right;margin-right: 50px;">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[5,10, 20, 30, 40]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="TaskData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
  </el-container>
</template>

<script>
import { getTaskInfo,update_task,delete_task,getTaskLogs } from '@/api/TaskManager'

export default {
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleLogs: false,
      dialogVisible: false,
      logsKey: 0,
      // 用于表单搜索
      formInline: {
        name: ''
      },
      // func数据测试用
      TaskData: [
        {
          task_id: '1',
          task_name: 'task_DesFaaS',
          task_desc: '动态迁移任务',
          task_type: '动态迁移',
          task_author: 'admin',
          task_model_id: 'DesFaaS',
          task_app_id: 'app1',
          task_create_time: '2024-04-25 10:11:23'
        },

      ],
      // 用于传递参数
      task_name: '',
      selectedTask: {
        task_logs: ''
      },
      editing: false,   // 是否处于编辑模式
      rules: {
        // 表单校验规则
      }
    }
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      if (this.formInline.name.trim()) {
        const keyword = this.formInline.name.trim().toLowerCase()
        return this.TaskData.filter(item => {
          const nameMatch = !this.formInline.name.trim() || item.task_name.toLowerCase().includes(keyword)
          return nameMatch
        })
      }
      return this.TaskData.slice(startIndex, endIndex)
    }
  },
  created() {
    this.fetchData()
  },

  mounted() {
  },
  methods: {
    fetchData() {
      getTaskInfo()
        .then(res => {
          console.log(res)
          this.TaskData = res.result;
        })
        .catch(err => {
          console.log(err)
        })
    },
    onSearch() {
      this.currentPage = 1 // 每次搜索时，回到第一页
    },
    onCancel() {
      this.formInline.name = ''
      this.formInline.status = ''
      this.currentPage = 1 // 每次取消搜索时，回到第一页
    },
    onRefresh() {
      console.log('refresh!')
      this.fetchData()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1 // 每次改变每页显示条数时，回到第一页
    },
    handleCurrentChange(val) {
      this.currentPage = val
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
    openTaskDialog(row) {

      this.dialogVisible = true;
      this.fetchTaskLogs(row.task_name,row.task_type);
    },
    async fetchTaskLogs(taskName,task_type) {
      try {
        // 模拟一个异步请求来获取日志
        const post_data= { // 新添加的用于收集额外信息的对象
          task_name: taskName,
          task_type: task_type,
        };
        // 调用 getTaskLogs 方法并传递 data 对象
        const res = await getTaskLogs(post_data);
        // 假设 res.result 包含所需的日志
        const logs = res.result;
        if (typeof logs === 'object') {
          this.selectedTask.task_logs = logs.log; // 格式化 JSON
        } else {
          this.selectedTask.task_logs = logs; // 直接赋值
        }
      } catch (error) {
        console.error('获取日志失败', error);
      }
    },
    closeTaskDialog() {
      this.dialogVisible = false;
      this.editing = false; // 退出编辑模式
    },
    saveChanges() {
      this.editing = false; // 退出编辑模式
      console.log(this.selectedTask)
      // 转化为后端需要的数据格式
      this.selectedTask.task_create_time = this.selectedTask.task_create_time.replace('T', ' ')
      // 调用上传数据的方法
      update_task(this.selectedTask)
        .then(res => {
          console.log(res)
          this.$message({
            message: '修改成功',
            type: 'success'
          })
        })
        .catch(err => {
          console.log(err)
          this.$message({
            message: '修改失败',
            type: 'error'
          })
        })
    },
    deleteTask() {
      // 执行删除任务操作
      delete_task(this.selectedTask)
        .then(res => {
          console.log(res)
          this.$message({
            message: '删除成功',
            type: 'success'
          })
        })
        .catch(err => {
          console.log(err)
          this.$message({
            message: '删除失败',
            type: 'error'
          })
        })
    },
    formatter(row, column) {
      return row.task_create_time
    }
  }

}
</script>

<style scoped>

</style>
