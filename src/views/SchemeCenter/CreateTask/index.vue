<template>
  <div class="task-form">
  <div class="center-content">
      <el-form ref="formData" :rules="rules" :model="formData" label-width="120px" v-loading="loading">
        <el-form-item label="任务类型" prop="task_type" placeholder="请选择">
          <el-select v-model="formData.task_type" >
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
          <el-button  type="text" size="middle" @click="FuncDialogVisible=true">选择函数</el-button>
          <el-button  type="text" size="middle" @click="WorkflowDialogVisible=true">选择工作流</el-button>
        </el-form-item>

        <el-form-item label="参数添加" v-if="formData.task_model_id === 'DesFaaS'">
          <el-input v-model="para.functionName" placeholder="函数名" />
          <el-input v-model="para.hasStateData" placeholder="是否有对应状态数据" />
          <el-input v-model="para.dataName" placeholder="数据名" />
          <el-input v-model="para.componentManagementAddress" placeholder="动态组件管理地址" />
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
        <el-table :data="ModelData_choose" :max-height="500">
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
      <!--对话框部分(选择函数)-->
      <el-dialog title="函数列表" :visible.sync="FuncDialogVisible" width="60%">
        <div v-if="selectedFunction" style="font-weight: bold; font-size: 18px;">
          当前选择的函数：{{ selectedFunction }}
        </div>
        <br>

        <!--form-->
        <el-table :data="FuncData" :max-height="500">
          <el-table-column type="selection" width="55"/>
          <el-table-column prop="func_id" label="编号" width="100" sortable />
          <el-table-column prop="func_name" label="函数名称" width="200" />
          <el-table-column prop="func_desc" label="函数描述" width="100" />
          <el-table-column prop="func_invoke_times" label="调用次数" sortable width="100"/>
          <el-table-column prop="func_status" label="状态" width="100"
            :filters="[{ text: 'Ready', value: 'Ready'}, { text: 'NotReady', value: 'NotReady'},]"
            :filter-method="filterTag"
            filter-placement="bottom-end"
          >
            <template slot-scope="scope">
              <!--根据tag值来选择颜色-->
              <el-tag :type="ChooseType(scope.row.func_status)" >{{ scope.row.func_status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template slot-scope="scope">
              <el-button size="mini" type="primary" @click="showSelectFunctionDialog(scope.row)">选择</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-table-column prop="func_create_time" label="创建时间" width="200" sortable :formatter="formatter" />
        <span slot="footer" class="dialog-footer">
          <el-button @click="FuncDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="changeFuncData">确 定</el-button>
        </span>
      </el-dialog>

      <!--对话框部分(选择工作流)-->
      <el-dialog title="工作流列表" :visible.sync="WorkflowDialogVisible" width="80%">
        <div v-if="selectedWorkflow" style="font-weight: bold; font-size: 18px;">
          当前选择的工作流：{{ selectedWorkflow }}
        </div>
        <br>
        <el-table :data="WorkflowData" style="width: 100%" :default-sort="{prop: 'app_create_time', order: 'descending'}">
          <el-table-column type="selection" width="55" />
          <el-table-column prop="workflow_id" label="工作流编号" width="100"/>
          <el-table-column prop="workflow_name" label="工作流名称" width="100"/>
          <el-table-column prop="workflow_desc" label="工作流描述" width="200"/>
          <el-table-column prop="workflow_invoke_times" label="调用次数" sortable width="120"/>
          <el-table-column prop="workflow_status" label="状态" width="80"
            :filters="
              [{ text: 'Ready', value: 'Ready'},
               { text: 'NotReady', value: 'NotReady'},
              ]"
            :filter-method="filterTag"
            filter-placement="bottom-end"
          >
            <template slot-scope="scope">
              <!--根据tag值来选择颜色-->
              <el-tag
                :type="ChooseType(scope.row.workflow_status)"
                disable-transitions
              >{{ scope.row.workflow_status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="workflow_replicas" label="副本数" sortable width="120"/>
          <el-table-column prop="workflow_create_time" label="创建时间" width="200" sortable :formatter="formatter"/>
          <el-table-column label="操作" width="100">
            <template slot-scope="scope">
              <el-button size="mini" type="primary" @click="showSelectWorkflowDialog(scope.row)">选择</el-button>
            </template>
          </el-table-column>
        </el-table>
        <span slot="footer" class="dialog-footer">
          <el-button @click="WorkflowDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="changeWorkflowData">确 定</el-button>
        </span>
      </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import { submit_task } from '@/api/TaskManager'
import { getModelInfo } from '@/api/ModelManager'
import { getFuncInfo, updateFuncInfo, deleteFunc } from '@/api/FuncSpy'
import { getWorkFlowInfo, updateWorkFlowInfo, deleteWorkFlow } from '@/api/WorkFlowSpy'
export default {
  data() {
    return {
      formData: {
        task_type: '',
        task_name: '',
        task_author: 'admin', // 你需要替换为实际的昵称
        task_desc: '',
        task_model_id: '',
        task_app_id: ''
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
      FuncDialogVisible: false,
      selectedFunction: '',
      FuncData: [],
      WorkflowDialogVisible: false,
      selectedWorkflow: '',
      WorkflowData: [],
      para: { // 新添加的用于收集额外信息的对象
        functionName: '',
        hasStateData: '',
        dataName: '',
        componentManagementAddress: '',
      },
    };
  },
  created() {
    this.fetchData()
  },
  computed: {
    ModelData_choose() {
      return this.ModelData.filter(model => model.model_type === this.formData.task_type);
    }
  },
  methods: {
    async submitForm(formName) {
      try {
        const valid = await this.$refs[formName].validate();

        if (valid) {
          this.loading = true;
          // 验证通过，发送 POST 请求到后端
          const post_data= { // 新添加的用于收集额外信息的对象
            formData: this.formData
          };
          const response = submit_task(post_data);
          // 处理返回结果
          if (response.status === 500) {
            this.$message.success('任务提交失败');
          } else {
            this.$message.success('任务提交成功');
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
          this.ModelData = res.result.filter(model => model.model_type !== '负载预测');
        })
        .catch(err => {
          console.log(err)
        })
      getFuncInfo()
        .then(res => {
          console.log(res)
          this.FuncData = res.result
        })
        .catch(err => {
          console.log(err)
        })
      getWorkFlowInfo()
        .then(res => {
          console.log(res)
          this.WorkflowData = res.result
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
    showSelectWorkflowDialog(Workflow) {
      this.selectedWorkflow = Workflow.workflow_name; // 设置选择的函数名称
    },
    changeFuncData() {
      if (this.selectedFunction) {
        name = this.selectedFunction;
        this.formData.task_app_id=name;
        this.FuncDialogVisible = false; // 关闭对话框
      }
    },
    changeWorkflowData() {
      if (this.selectedWorkflow) {
        name = this.selectedWorkflow;
        this.formData.task_app_id=name;
        this.WorkflowDialogVisible = false; // 关闭对话框
      }
    },
    ChooseType(func_status) {
      if (func_status === 'Ready') {
        return 'success'
      } else if (func_status === 'NotReady') {
        return 'danger'
      }
    },
    showSelectFunctionDialog(func) {
        this.selectedFunction = func.func_name; // 设置选择的函数名称
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
