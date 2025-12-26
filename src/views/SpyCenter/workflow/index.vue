<!--工作流监管模块-->
<template>
  <el-container>
    <el-header style="margin-top: 15px; height: 15px">
      方舱工作流监管模块
    </el-header>
    <el-main>
      <el-form
        :inline="true"
        :model="formInline"
        class="demo-form-inline"
        size="medium"
      >
        <el-form-item label="方舱工作流名字" size="medium">
          <el-input v-model="formInline.name" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="状态" size="medium">
          <el-select v-model="formInline.status" placeholder="">
            <el-option label="Ready" value="Ready" />
            <el-option label="NotReady" value="NotReady" />
          </el-select>
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
        <el-button style="width: 110px"
          >更多操作&nbsp;<i class="el-icon-bottom el-icon--left"
        /></el-button>
      </div>
      <el-table
        :data="currentPageData"
        style="width: 100%"
        :default-sort="{ prop: 'app_create_time', order: 'descending' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column
          prop="workflow_id"
          label="方舱工作流编号"
          width="120"
        />
        <el-table-column
          prop="workflow_name"
          label="方舱工作流名称"
          width="200"
        />
        <el-table-column
          prop="workflow_desc"
          label="方舱工作流描述"
          width="300"
        />
        <el-table-column
          prop="workflow_invoke_times"
          label="调用次数"
          sortable
          width="120"
        />
        <el-table-column
          prop="workflow_status"
          label="状态"
          width="160"
          :filters="[
            { text: 'Ready', value: 'Ready' },
            { text: 'NotReady', value: 'NotReady' },
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
        <el-table-column
          prop="workflow_replicas"
          label="副本数"
          sortable
          width="120"
        />
        <!--        <el-table-column-->
        <!--          prop="workflow_create_time"-->
        <!--          label="创建时间"-->
        <!--          width="200"-->
        <!--          sortable-->
        <!--          :formatter="formatter"-->
        <!--        />-->
        <el-table-column label="操作" width="350">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="primary"
              @click="handleEdit(scope.$index, scope.row)"
              >配置</el-button
            >
            <el-button
              size="mini"
              @click="checkWorkFlowLogs(scope.$index, scope.row)"
              >查看日志</el-button
            >
            <el-button
              size="mini"
              type="danger"
              @click="DeleteWorkFlow(scope.$index, scope.row)"
              >删除</el-button
            >
            <el-button size="mini" type="primary" @click="viewTrace(scope.row)"
              >查看 Trace</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-dialog :visible="dialogVisibleYaml" @close="closeDialogYaml">
        <keep-alive>
          <WorkFlow_Yaml
            v-if="dialogVisibleYaml"
            :key="yamlKey"
            :workflow_name="workflow_name"
          />
        </keep-alive>
      </el-dialog>
      <el-dialog :visible="dialogVisibleLogs" @close="closeDialogLogs">
        <keep-alive>
          <WorkFlow_Logs
            v-if="dialogVisibleLogs"
            :key="logsKey"
            :workflow_name="workflow_name"
          />
        </keep-alive>
      </el-dialog>
      <el-dialog :visible="dialogVisibleTrace" @close="closeDialogTrace">
        <div>
          <!-- 在这里显示最近运行的工作流 ID 数据 -->
          <el-table :data="recentWorkflowIds" style="width: 100%">
            <el-table-column
              prop="traceId"
              label="Trace ID"
              width="200"
            ></el-table-column>
            <el-table-column
              prop="time"
              label="时间"
              width="200"
            ></el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="scope">
                <el-button
                  type="primary"
                  @click="viewTracedetail(scope.row.traceId)"
                  >查看</el-button
                >
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-dialog>
    </el-main>
    <el-footer>
      <div class="block" style="text-align: right; margin-right: 50px">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[5, 10, 20, 30, 40]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="WorkFlowData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
  </el-container>
</template>

<script>
import {
  getWorkFlowInfo,
  updateWorkFlowInfo,
  deleteWorkFlow,
  getWorkFlowTraceId,
} from "@/api/WorkFlowSpy";
import WorkFlow_Yaml from "@/views/SpyCenter/workflow/workflow_yaml.vue";
import WorkFlow_Logs from "@/views/SpyCenter/workflow/workflow_logs.vue";

export default {
  components: { WorkFlow_Yaml, WorkFlow_Logs },
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleLogs: false,
      logsKey: 0,
      // 用于表格搜索
      formInline: {
        name: "",
        status: "",
      },
      WorkFlowData: [
        {
          workflow_id: "1",
          workflow_name: "workflow1",
          workflow_desc: "workflow1的描述",
          workflow_status: "Ready",
          workflow_replicas: 1,
          workflow_invoke_times: 100,
          workflow_create_time: "2023-01-01 00:00:00",
        },
      ],
      // 用于传递参数
      workflow_name: "",
      dialogVisibleTrace: false,
      recentWorkflowIds: [],
    };
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      if (this.formInline.name.trim() || this.formInline.status.trim()) {
        return this.WorkFlowData.filter((item) => {
          const nameMatch =
            !this.formInline.name.trim() ||
            item.workflow_name
              .toLowerCase()
              .includes(this.formInline.name.trim().toLowerCase());
          const statusMatch =
            !this.formInline.status.trim().toLowerCase() ||
            item.workflow_status.toLowerCase() ===
              this.formInline.status.trim().toLowerCase();
          return nameMatch && statusMatch;
        });
      }
      return this.WorkFlowData.slice(startIndex, endIndex);
    },
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      getWorkFlowInfo()
        .then((res) => {
          console.log(res);
          this.WorkFlowData = res.result;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    updateData() {
      updateWorkFlowInfo()
        .then((res) => {
          console.log(res);
          this.WorkFlowData = res.result;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    onSearch() {
      this.currentPage = 1;
    },
    onCancel() {
      this.formInline.name = "";
      this.formInline.status = "";
      this.currentPage = 1;
    },
    onRefresh() {
      console.log("refresh!");
      this.updateData();
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
    },
    handleCurrentChange(val) {
      this.currentPage = val;
    },
    handleEdit(index, row) {
      console.log(index, row);
      this.dialogVisibleYaml = true;
      this.yamlKey = this.yamlKey + 1;
      this.workflow_name = row.workflow_name;
    },
    closeDialogYaml() {
      this.dialogVisibleYaml = false;
    },
    checkWorkFlowLogs(index, row) {
      console.log(index, row);
      this.dialogVisibleLogs = true;
      this.logsKey = this.logsKey + 1;
      this.workflow_name = row.workflow_name;
    },
    viewTrace(row) {
      console.log(row);
      this.dialogVisibleTrace = true;
      getWorkFlowTraceId(row)
        .then((res) => {
          console.log(res);
          this.recentWorkflowIds = res.result;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    viewTracedetail(traceId) {
      // 拼接访问链接
      const traceUrl = `http://10.60.150.74:31668/trace/${traceId}`;
      // 打开新窗口或标签页以访问链接
      window.open(traceUrl, "_blank");
    },
    closeDialogTrace() {
      this.dialogVisibleTrace = false;
    },
    closeDialogLogs() {
      this.dialogVisibleLogs = false;
    },
    DeleteWorkFlow(index, row) {
      console.log(index, row);
      const data = {
        workflow_name: row.workflow_name,
      };
      deleteWorkFlow(data)
        .then((res) => {
          this.$message({
            message: res.result,
            type: "success",
          });
          this.fetchData();
        })
        .catch((err) => {
          this.$message({
            message: err,
            type: "error",
          });
        });
    },
    formatter(row, column) {
      return row.workflow_create_time;
    },
    filterTag(value, row) {
      return row.tag === value;
    },
    ChooseType(workflow_status) {
      if (workflow_status === "Ready") {
        return "success";
      } else if (workflow_status === "NotReady") {
        return "danger";
      }
    },
  },
};
</script>

<style scoped></style>
