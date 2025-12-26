<template>
  <div class="task-form">
  <div class="center-content">
      <el-form ref="formData" :rules="rules" :model="formData" label-width="120px" v-loading="loading">
        <el-form-item label="任务类型" prop="task_type">
          <el-select v-model="formData.task_type" placeholder="请选择">
            <el-option label="负载预测" value="负载预测" />
            <el-option label="实例伸缩" value="实例伸缩" />
            <el-option label="初始部署" value="初始部署" />
            <el-option label="动态迁移" value="动态迁移" />
            <el-option label="任务调度" value="任务调度" />
          </el-select>
        </el-form-item>

        <el-form-item label="任务名称" prop="task_name">
          <el-input v-model="formData.task_name" />
        </el-form-item>

        <el-form-item label="任务作者" prop="task_author">
          <el-input :value="formData.task_author" disabled />
        </el-form-item>

        <el-form-item label="任务描述" prop="task_desc">
          <el-input type="textarea" v-model="formData.task_desc" />
        </el-form-item>

        <el-form-item label="模型绑定" prop="task_model_id">
          <el-input v-model="formData.task_model_id" />
          <el-button  type="text" size="middle" @click="ModelDialogVisible=true">选择模型</el-button>
        </el-form-item>

        <el-form-item label="应用绑定" prop="task_app_id">
          <el-input v-model="formData.task_app_id" />
        </el-form-item>


        <el-form-item>
          <el-button type="primary" @click="submitForm('formData')">提交</el-button>
          <el-button @click="resetForm('formData')">重置</el-button>
        </el-form-item>

      </el-form>
    </div>

      <!--对话框部分(选择模型)-->
      <el-dialog title="模型列表" :visible.sync="ModelDialogVisible" width="60%">
        <div v-if="selectedModel" style="font-weight: bold; font-size: 18px;">
          当前选择的模型：{{ selectedModel }}
        </div>
        <br>

        <!--form-->
        <el-table :data="ModelData" :max-height="500">
          <el-table-column type="selection" width="55"/>
          <el-table-column prop="model_id" label="编号" width="80" sortable />
          <el-table-column prop="model_name" label="模型名称" width="100" />
          <el-table-column prop="model_type" label="模型类型" width="100" />
          <el-table-column prop="model_desc" label="模型描述" width="150" />
          <el-table-column prop="model_create_time" label="创建时间" width="200" sortable :formatter="formatter" />
          <el-table-column label="操作" width="100">
            <template slot-scope="scope">
              <el-button size="mini" type="primary" @click="showSelectModelDialog(scope.row)">选择</el-button>
            </template>
          </el-table-column>
        </el-table>
        <span slot="footer" class="dialog-footer">
          <el-button @click="ModelDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="changeModelData">确 定</el-button>
        </span>
      </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import { submit_task } from '@/api/TaskManager'
import { getModelInfo } from '@/api/ModelManager'
import { baseURL } from '@/api/axiosConfig.js'

export default {
  data() {
    return {
      formData: {
        task_type: '',
        task_name: '',
        task_author: 'admin', // 你需要替换为实际的昵称
        task_desc: '',
        task_model_id: '',
        task_app_id: '',

      },

      rules: {
        task_name: [
          { required: true, message: '请输入任务名字', trigger: 'change' }
        ],
        task_type: [
          { required: true, message: '请选择任务类型', trigger: 'change' }
        ],
        task_author: [
          { required: false }
        ],
        task_desc: [
          { required: false }
        ],
        task_model_id: [
          { required: true, message: '请选择所绑定模型', trigger: 'change' }
        ],
        task_app_id: [
          { required: false, message: '请选择所绑定应用', trigger: 'change' }
        ]
      },
      loading: false,
      ModelDialogVisible: false,
      ModelData:[],
      selectedModel: '',
    };
  },
  created() {
    this.fetchData()
  },
  methods: {
    async submitForm(formName) {
      try {
        const valid = await this.$refs[formName].validate();

        if (valid) {
          this.loading = true;
          // 验证通过，发送 POST 请求到后端
          let submit_task_url = baseURL + '/submit_task'
          const response = await axios.post(submit_task_url, this.formData);
          // 处理返回结果
          if (response.status === 200) {
            this.$message.success('任务提交成功');
          } else {
            this.$message.error('任务提交失败');
          }
        } else {
          this.$message.error('表单验证失败，请检查输入');
        }
      } catch (error) {
        console.error('提交任务时发生错误:', error);
        this.$message.error('提交任务时发生错误: ' + error.message);
      }finally {
        this.loading = false; // 无论成功还是失败，都取消 loading
      }
    },
    resetForm(formName) {
        this.$refs[formName].resetFields();
    },
    fetchData() {
      getModelInfo()
        .then(res => {
          console.log(res)
          this.ModelData = res.result
        })
        .catch(err => {
          console.log(err)
        })
    },
    showSelectModelDialog(model) {
      this.selectedModel = model.model_name; // 设置选择的函数名称
    },
    changeModelData() {
      if (this.selectedModel) {
        name = this.selectedModel;
        this.formData.task_model_id=name;
        this.ModelDialogVisible = false; // 关闭对话框
      }
    },
  },
};
</script>

<style scoped>
.task-form {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* 确保容器至少占满整个视口高度 */
}
.center-content {
  width: 70%; /* 调整表单宽度 */
  margin-right: 1%; /* 左侧偏移量 */
}
</style>
