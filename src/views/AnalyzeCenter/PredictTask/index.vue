<!--任务管理模块-->
<template>
  <el-container>
    <el-header style="margin-top:15px;height: 15px">
      任务管理模块
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
          width="120"
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
          width="150"
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
          prop="task_app_id"
          label="应用绑定"
          width="120"
        />
        <el-table-column
          prop="task_create_time"
          label="创建时间"
          width="200"
          sortable
          :formatter="formatter"
        />
        <el-table-column label="操作" width="100">
          <template slot-scope="scope">
            <div style="display: flex;">
              <el-button  type="text" size="middle" @click="openTaskDialog(scope.row)">详情</el-button>
              <el-button type="text" @click="deletescopeTask(scope.row)" style="color: red;">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
        <!-- 对话框 -->
      <el-dialog title="任务详情" :visible="dialogVisible" @close="closeTaskDialog">
        <el-form :model="selectedTask" :rules="rules" ref="taskForm">
          <el-form-item label="任务类型" prop="task_type">
            <el-input v-model="selectedTask.task_type" :disabled="!editing"></el-input>
          </el-form-item>
          <el-form-item label="任务名称" prop="task_name">
            <el-input v-model="selectedTask.task_name" :disabled="!editing"></el-input>
          </el-form-item>
          <el-form-item label="任务描述" prop="task_desc">
            <el-input v-model="selectedTask.task_desc" :disabled="!editing"></el-input>
          </el-form-item>
          <el-form-item label="任务作者" prop="task_auther">
            <el-input v-model="selectedTask.task_author" :disabled="true"></el-input>
          </el-form-item>
          <el-form-item label="模型绑定" prop="task_model_id">
            <el-input v-model="selectedTask.task_model_id" :disabled="!editing"></el-input>
          </el-form-item>
          <el-form-item label="应用绑定" prop="task_app_id">
            <el-input v-model="selectedTask.task_app_id" :disabled="!editing"></el-input>
          </el-form-item>
          <!-- 其他字段 -->
        </el-form>

        <el-button v-if="!editing" @click="editing = true">修改</el-button>
        <el-button v-else @click="saveChanges">提交</el-button>
        <el-button v-if="!editing" type="danger" @click="deleteTask">删除</el-button>
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
import { getTaskInfo,update_task,delete_task } from '@/api/TaskManager'

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
          task_name: 'task1',
          task_desc: 'task1',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model1',
          task_app_id: 'app1',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '2',
          task_name: 'task2',
          task_desc: 'task2',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model2',
          task_app_id: 'app2',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '3',
          task_name: 'task3',
          task_desc: 'task3',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model3',
          task_app_id: 'app3',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '4',
          task_name: 'task4',
          task_desc: 'task4',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model4',
          task_app_id: 'app4',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '5',
          task_name: 'task5',
          task_desc: 'task5',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model5',
          task_app_id: 'app5',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '6',
          task_name: 'task6',
          task_desc: 'task6',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model6',
          task_app_id: 'app6',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '7',
          task_name: 'task7',
          task_desc: 'task7',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model7',
          task_app_id: 'app7',
          task_create_time: '2020-01-01 00:00:00'
        },
        {
          task_id: '8',
          task_name: 'task8',
          task_desc: 'task8',
          task_type: '负载预测',
          task_author: 'id1',
          task_model_id: 'model8',
          task_app_id: 'app8',
          task_create_time: '2020-01-01 00:00:00'
        }
      ],
      // 用于传递参数
      task_name: '',
      selectedTask: {}, // 存储选中的任务数据
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
          this.TaskData = res.result.filter(task => task.task_type === '负载预测');
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
    openTaskDialog(task) {
      this.selectedTask = { ...task }; // 复制任务数据以防止修改时影响原数据
      this.dialogVisible = true;
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
    deletescopeTask(task) {
      // 执行删除任务操作
      this.selectedTask = { ...task }
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
