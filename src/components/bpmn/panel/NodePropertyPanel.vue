<template>
  <div>
      <el-form :inline="false"
             label-width="100px"
             size="small"
             label-position="right"
              >
        <!--在此处用户输入的节点名称作为id内容存放在bpmn文件中-->
        <el-form-item label="节点名称">
          <el-input v-model="localFormData.id" @input="updateId"></el-input>
        </el-form-item>
        <el-form-item label="节点类型">
          <el-input v-model="localFormData.type" disabled></el-input>
        </el-form-item>
        <el-form-item label="节点函数">
          <el-input v-model="localFormData.name" @input="updateName"></el-input>
        </el-form-item>
        <el-form-item label="">
        <el-button  type="text" size="middle" @click="FunctionDialogVisible=true">选择函数顺序</el-button>
        </el-form-item>
      </el-form>

      <!--对话框部分(选择函数)-->
      <el-dialog title="函数列表" :visible.sync="FunctionDialogVisible" width="60%">
        <el-form :model="NodeFuncs" ref="NodeFuncs" label-width="100px" class="NodeFuncs">
          <!--选择多个函数-->
          <el-form-item
            v-for="(funcs, index) in NodeFuncs"
            :label="'函数' + index"
            :key="funcs.key"
            :prop="'NodeFuncs.' + index + '.value'"
            :rules="{
              required: true, message: '函数不能为空', trigger: 'blur'
            }"
          >
            <el-input v-model="funcs.value" style="width: 50%;"></el-input>
            <el-button @click.prevent="removeFunc(funcs)">删除</el-button>
            <el-button  type="text" size="middle" @click="SelectedFuncs(index)">选择函数</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="submitFuncs()">提交</el-button>
            <el-button @click="addFunc">新增函数</el-button>

          </el-form-item>
        </el-form>
      </el-dialog>

      <!--抽屉部分(选择函数)-->
      <el-drawer
      :visible.sync="FunctionDrawerVisible"
      title="选择函数"
      :before-close="beforeDrawerClose"
      size="50%"
      >
        <!--form-->
        <el-table :data="FuncData" :max-height="500">
          <el-table-column type="selection" width="55"/>
          <el-table-column prop="func_id" label="编号" width="100" sortable />
          <el-table-column prop="func_name" label="函数名称" width="180" />
          <el-table-column prop="func_desc" label="函数描述" width="100" />
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
        <el-form>
          <div v-if="selectedFunction" style="font-weight: bold; font-size: 18px;">
            当前选择的函数：{{ selectedFunction }}
          </div>
          <el-form-item>
            <el-button type="primary" @click="changeFuncData">确 定</el-button>
          </el-form-item>
        </el-form>
      </el-drawer>

      <!--usertask-->
      <el-form-item v-if="localFormData.type=='bpmn:UserTask'" label="节点人员">
        <el-select v-model="localFormData.userType" placeholder="请选择">
          <el-option value="assignee" label="负责人"></el-option>
          <el-option value="candidateUsers" label="候选人员"></el-option>
         <!-- <el-option value="candidateGroups" label="角色/岗位"></el-option> -->
        </el-select>
      </el-form-item>
      <el-form-item label="负责人" v-if="localFormData.type=='bpmn:UserTask' && localFormData.userType === 'assignee'">
        <el-input placeholder="请输入负责人" v-model="localFormData.assignee" @blur="updateAssignee(localFormData.assignee)"/>
        <!--<el-select
            v-model="localFormData.assignee"
            placeholder="请选择"
            key="1"
            @change="(value) => addUser({assignee: value})"
        >
          <el-option
              v-for="item in bpmnData.assignees"
              :key="item.value"
              :label="item.label"
              :value="item.value"
          ></el-option>
        </el-select>-->
      </el-form-item>
      <el-form-item label="候选人员" v-else-if="localFormData.type=='bpmn:UserTask' && localFormData.userType === 'candidateUsers'">
        <el-input placeholder="请输入候选人" v-model="localFormData.candidateUsers"
        @blur="updateCandidateUsers(localFormData.candidateUsers)"/>
      </el-form-item>
      <!-- <el-form-item label="角色/岗位" v-else-if="localFormData.type=='bpmn:UserFunc' && localFormData.userType === 'candidateGroups'">
        <el-select
            v-model="localFormData.candidateGroups"
            placeholder="请选择"
            @change="(value) => addUser({candidateGroups: value})"
        >
          <el-option
              v-for="item in bpmnData.roles"
              :key="item.value"
              :label="item.label"
              :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item> -->
      <!--sequenceFlow-->
      <el-form-item v-if="localFormData.type=='bpmn:SequenceFlow'" label="分支条件">
        <el-input v-model="localFormData.sequenceFlow" @input="updateSequenceFlow"></el-input>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { getFuncInfo, updateFuncInfo, deleteFunc } from '@/api/FuncSpy'
  export default {
    name: "NodePropertyPanel",
    data() {
      return {
        FunctionDialogVisible: false,
        FunctionDrawerVisible: false,
        SelectedFunctionIndex:'',
        selectedFunction: '',
        FunctionList: '',
        NodeFuncs: [{
          value: ''
        }],
          // func数据测试用
        FuncData: [
          {
            func_id: '1',
            func_name: 'func1',
            func_desc: 'func1',
            func_invoke_times: '1',
            func_status: 'Ready',
            func_create_time: '2020-01-01 00:00:00'
          },
          {
            func_id: '2',
            func_name: 'func2',
            func_desc: 'func2',
            func_invoke_times: '2',
            func_status: 'NotReady',
            func_create_time: '2020-01-01 00:00:00'
          },
          {
            func_id: '3',
            func_name: 'func3',
            func_desc: 'func3',
            func_invoke_times: '3',
            func_status: 'Ready',
            func_create_time: '2020-01-01 00:00:00'
          },
          {
            func_id: '4',
            func_name: 'func4',
            func_desc: 'func4',
            func_invoke_times: '4',
            func_status: 'NotReady',
            func_create_time: '2020-01-01 00:00:00'
          },
        ]
      }
    },
    props: {
      modeler: {
        type: Object,
        required: true
      },
      nodeElement: {
        type: Object,
        required: true
      },
      formData:{
        type: Object,
        required: true,

      }
    },
    computed:{
      currentPageData() {
          const startIndex = (this.currentPage - 1) * this.pageSize
          const endIndex = startIndex + this.pageSize
          return this.FuncData.slice(startIndex, endIndex)
      },
      localFormData:{
        get(){
          return this.formData
        }
      }
    },
    created() {
      this.fetchData()
    },
    watch:{
      nodeElement:{
        handler(){
          if(this.nodeElement.type=="bpmn:StartEvent"){
            this.updateName("开始");
          }
          if(this.nodeElement.type=="bpmn:EndEvent"){
            this.updateName("结束");
          }
        }
      }
    },
    methods: {
      updateProperties(properties){
        this.modeler.get("modeling").updateProperties(this.nodeElement, properties);
      },
      updateId(name) {
        this.updateProperties({id: name});
      },
      updateName(name) {
        this.updateProperties({name: name});
      },
      updateAssignee(name){
        this.updateProperties({assignee:name});
      },
      updateCandidateUsers(name){
        this.updateProperties({candidateUsers:name});
      },
      updateSequenceFlow(val){
        let newCondition = this.modeler.get("moddle").create('bpmn:FormalExpression', {
          body: val
        });
        this.updateProperties({conditionExpression:newCondition});
      },
      addUser(properties){
        this.updateProperties(properties);
        Object.assign(properties, {
          userType: Object.keys(properties)[0]
        });
        this.$emit('modifyFormData',properties);
      },
      ChooseType(func_status) {
        if (func_status === 'Ready') {
          return 'success'
        } else if (func_status === 'NotReady') {
          return 'danger'
        }
      },
      fetchData() {
        getFuncInfo()
          .then(res => {
            console.log(res)
            this.FuncData = res.result
          })
          .catch(err => {
            console.log(err)
          })
      },
      showSelectFunctionDialog(func) {
        this.selectedFunction = func.func_name; // 设置选择的函数名称
      },
      changeFuncData() {
        if (this.selectedFunction) {
          name = this.selectedFunction;
          this.NodeFuncs[this.SelectedFunctionIndex].value=name;
          this.FunctionDrawerVisible = false; // 关闭对话框
        }
      },
      addFunc() {
        this.NodeFuncs.push({
          value: '',
          key: Date.now()
        });
      },
      removeFunc(item) {
        var index = this.NodeFuncs.indexOf(item)
        if (index !== -1) {
          this.NodeFuncs.splice(index, 1)
        }
      },
      SelectedFuncs(index){
        this.FunctionDrawerVisible=true;
        this.SelectedFunctionIndex=index;
        console.log(this.SelectedFunctionIndex);
      },
      submitFuncs(){
        const separator = ','; // 分隔符，你可以根据需要更改
        this.FunctionList='';
        // 遍历 NodeFuncs 数组
        for (const func of this.NodeFuncs) {
          if (func.value.trim() !== '') {
            // 如果函数的值不为空，将其添加到 FunctionList 字符串
            if (this.FunctionList !== '') {
              this.FunctionList += separator; // 添加分隔符（如果不是第一个函数）
            }
            this.FunctionList += func.value;
          }
        }
        // 输出结果
        console.log(this.FunctionList);
        this.FunctionDialogVisible=false;
        this.updateName(this.FunctionList);
      }
    }
  }
</script>

<style scoped>

</style>
