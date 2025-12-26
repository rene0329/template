<!--函数监管模块-->
<template>
  <el-container>
    <el-header style="margin-top: 15px; height: 15px">
      方舱函数监管模块
    </el-header>
    <el-main>
      <el-form
        :inline="true"
        :model="formInline"
        class="demo-form-inline"
        size="medium"
      >
        <el-form-item label="函数名称" size="medium">
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
        :default-sort="{ prop: 'func_id', order: 'descending' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column
          prop="func_id"
          label="方舱函数编号"
          width="130"
          sortable
        />
        <el-table-column prop="func_name" label="方舱函数名称" width="200" />
        <el-table-column prop="func_desc" label="方舱函数描述" width="130" />
        <el-table-column
          prop="func_invoke_times"
          label="调用次数"
          sortable
          width="100"
        />
        <el-table-column
          prop="func_status"
          label="状态"
          width="100"
          :filters="[
            { text: 'Ready', value: 'Ready' },
            { text: 'NotReady', value: 'NotReady' },
          ]"
          :filter-method="filterTag"
          filter-placement="bottom-end"
        >
          <template slot-scope="scope">
            <!--根据tag值来选择颜色-->
            <el-tag :type="ChooseType(scope.row.func_status)"
              >{{ scope.row.func_status }}
            </el-tag>
          </template>
        </el-table-column>
        <!--        <el-table-column-->
        <!--          prop="func_create_time"-->
        <!--          label="创建时间"-->
        <!--          width="200"-->
        <!--          sortable-->
        <!--          :formatter="formatter"-->
        <!--        />-->
        <el-table-column label="操作" width="300">
          <template slot-scope="scope">
            <div style="display: flex">
              <el-button
                size="mini"
                type="primary"
                @click="handleEdit(scope.$index, scope.row)"
                >配置
              </el-button>
              <el-button
                size="mini"
                @click="checkFuncLogs(scope.$index, scope.row)"
                >查看日志</el-button
              >
              <el-button
                size="mini"
                type="danger"
                @click="DeleteFunc(scope.$index, scope.row)"
                >删除</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-dialog :visible="dialogVisibleYaml" @close="closeDialogYaml">
        <keep-alive>
          <Func_Yaml
            v-if="dialogVisibleYaml"
            :key="yamlKey"
            :func_name="func_name"
          />
        </keep-alive>
      </el-dialog>
      <el-dialog :visible="dialogVisibleLogs" @close="closeDialogLogs">
        <keep-alive>
          <Func_Logs
            v-if="dialogVisibleLogs"
            :key="logsKey"
            :func_name="func_name"
          />
        </keep-alive>
      </el-dialog>
    </el-main>
    <el-footer>
      <div class="block" style="text-align: right; margin-right: 50px">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[5, 10, 20, 30, 40]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="FuncData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
  </el-container>
</template>

<script>
import { getFuncInfo, updateFuncInfo, deleteFunc } from "@/api/FuncSpy";
import Func_Yaml from "@/views/SpyCenter/function_spy/func_yaml.vue";
import Func_Logs from "@/views/SpyCenter/function_spy/func_logs.vue";

export default {
  components: { Func_Yaml, Func_Logs },
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleLogs: false,
      logsKey: 0,
      // 用于表单搜索
      formInline: {
        name: "",
        status: "",
      },
      // func数据测试用
      FuncData: [
        {
          func_id: "1",
          func_name: "func1",
          func_desc: "func1",
          func_invoke_times: "1",
          func_status: "Ready",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "2",
          func_name: "func2",
          func_desc: "func2",
          func_invoke_times: "2",
          func_status: "NotReady",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "3",
          func_name: "func3",
          func_desc: "func3",
          func_invoke_times: "3",
          func_status: "Ready",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "4",
          func_name: "func4",
          func_desc: "func4",
          func_invoke_times: "4",
          func_status: "NotReady",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "5",
          func_name: "func5",
          func_desc: "func5",
          func_invoke_times: "5",
          func_status: "Ready",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "6",
          func_name: "func6",
          func_desc: "func6",
          func_invoke_times: "6",
          func_status: "NotReady",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "7",
          func_name: "func7",
          func_desc: "func7",
          func_invoke_times: "7",
          func_status: "Ready",
          func_create_time: "2020-01-01 00:00:00",
        },
        {
          func_id: "8",
          func_name: "func8",
          func_desc: "func8",
          func_invoke_times: "8",
          func_status: "NotReady",
          func_create_time: "2020-01-01 00:00:00",
        },
      ],
      // 用于传递参数
      func_name: "",
    };
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      if (this.formInline.name.trim() || this.formInline.status.trim()) {
        const keyword = this.formInline.name.trim().toLowerCase();
        return this.FuncData.filter((item) => {
          const nameMatch =
            !this.formInline.name.trim() ||
            item.func_name.toLowerCase().includes(keyword);
          const statusMatch =
            !this.formInline.status.trim().toLowerCase() ||
            item.func_status.toLowerCase() ===
              this.formInline.status.trim().toLowerCase();
          return nameMatch && statusMatch;
        });
      }
      return this.FuncData.slice(startIndex, endIndex);
    },
  },
  created() {
    this.fetchData();
  },

  mounted() {},
  methods: {
    fetchData() {
      getFuncInfo()
        .then((res) => {
          console.log(res);
          this.FuncData = res.result;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    updateData() {
      updateFuncInfo()
        .then((res) => {
          console.log(res);
          this.FuncData = res.result;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    onSearch() {
      this.currentPage = 1; // 每次搜索时，回到第一页
    },
    onCancel() {
      this.formInline.name = "";
      this.formInline.status = "";
      this.currentPage = 1; // 每次取消搜索时，回到第一页
    },
    onRefresh() {
      console.log("refresh!");
      this.updateData();
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1; // 每次改变每页显示条数时，回到第一页
    },
    handleCurrentChange(val) {
      this.currentPage = val;
    },
    handleEdit(index, row) {
      console.log(index, row);
      this.dialogVisibleYaml = true;
      this.yamlKey = this.yamlKey + 1;
      this.func_name = row.func_name;
    },
    closeDialogYaml() {
      this.dialogVisibleYaml = false;
    },
    checkFuncLogs(index, row) {
      console.log(index, row);
      this.dialogVisibleLogs = true;
      this.logsKey = this.logsKey + 1;
      this.func_name = row.func_name;
    },
    closeDialogLogs() {
      this.dialogVisibleLogs = false;
    },
    DeleteFunc(index, row) {
      console.log(index, row);
      const data = {
        func_name: row.func_name,
      };
      deleteFunc(data)
        .then((res) => {
          this.$message({
            message: res.result,
            type: "success",
          });
          this.fetchData();
        })
        .catch((err) => {
          console.log(err);
          this.$message({
            message: err,
            type: "error",
          });
        });
    },
    formatter(row, column) {
      return row.func_create_time;
    },
    filterTag(value, row) {
      return row.func_status === value;
    },
    ChooseType(func_status) {
      if (func_status === "Ready") {
        return "success";
      } else if (func_status === "NotReady") {
        return "danger";
      }
    },
  },
};
</script>

<style scoped></style>
