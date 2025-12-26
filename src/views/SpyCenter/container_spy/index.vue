<!--容器监管模块-->
<template>
  <el-container>
    <el-header style="margin-top: 15px; height: 15px">
      方舱容器(pod)监管模块
    </el-header>
    <el-main>
      <el-form
        :inline="true"
        :model="formInline"
        class="demo-form-inline"
        size="medium"
      >
        <el-form-item label="容器名字" size="medium">
          <el-input v-model="formInline.name" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="状态" size="medium">
          <el-select v-model="formInline.status" placeholder="">
            <el-option label="Running" value="Running" />
            <el-option label="Pending" value="Pending" />
            <el-option label="Succeeded" value="Succeeded" />
            <el-option label="Failed" value="Failed" />
            <el-option label="Unknown" value="Unknown" />
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
      <div style="display: flex">
        <el-col :span="24" style="margin-top: 10px; overflow-x: auto">
          <el-card>
            <el-table
              :data="currentPageData"
              style="width: 100%"
              :default-sort="{ prop: 'pod_id', order: 'upward' }"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="pod_id" label="方舱容器编号" width="120" />
              <el-table-column
                prop="pod_name"
                label="方舱容器名称"
                width="120"
              />
              <el-table-column label="方舱容器资源信息" width="140">
                <template slot-scope="scope">
                  <el-popover placement="top" width="300" trigger="hover">
                    <el-table :data="[scope.row]" style="width: 100%">
                      <el-table-column
                        width="140"
                        prop="pod_request_cpu"
                        label="pod_cpu下限"
                      />
                      <el-table-column
                        width="140"
                        prop="pod_request_mem"
                        label="pod_mem下限"
                      />
                      <el-table-column
                        width="140"
                        prop="pod_limit_cpu"
                        label="pod_cpu上限"
                      />
                      <el-table-column
                        width="140"
                        prop="pod_limit_mem"
                        label="pod_mem上限"
                      />
                    </el-table>
                    <el-button slot="reference" size="mini" type="primary"
                      >查看</el-button
                    >
                  </el-popover>
                </template>
              </el-table-column>
              <el-table-column
                prop="pod_status"
                label="方舱容器状态"
                width="120"
                :filters="[
                  { text: 'Pending', value: 'Pending' },
                  { text: 'Running', value: 'Running' },
                  { text: 'Succeeded', value: 'Succeeded' },
                  { text: 'Failed', value: 'Failed' },
                  { text: 'Unknown', value: 'Unknown' },
                ]"
                :filter-method="filterTag"
                filter-placement="bottom-end"
              >
                <template slot-scope="scope">
                  <!--根据tag值来选择颜色-->
                  <el-tag
                    :type="ChooseType(scope.row.pod_status)"
                    disable-transitions
                    >{{ scope.row.pod_status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="pod_node"
                label="方舱容器所属node"
                width="140"
              />
              <el-table-column
                prop="pod_start_time"
                label="方舱容器启动时间"
                width="200"
                sortable
                :formatter="formatter"
              />
              <el-table-column label="操作">
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
                      @click="checkPodRates(scope.$index, scope.row)"
                      >查看使用率
                    </el-button>
                    <el-button
                      size="mini"
                      @click="checkPodLogs(scope.$index, scope.row)"
                      >查看日志
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <el-footer>
              <div class="block" style="text-align: right; margin-right: 50px">
                <el-pagination
                  :current-page="currentPage"
                  :page-sizes="[5, 10, 20, 30, 40]"
                  :page-size="pageSize"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="PodData.length"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-footer>
          </el-card>
        </el-col>
      </div>
      <el-dialog :visible="dialogVisibleYaml" @close="closeDialogYaml">
        <keep-alive>
          <Pod_Yaml
            v-if="dialogVisibleYaml"
            :key="yamlKey"
            :pod_name="pod_name"
          />
        </keep-alive>
      </el-dialog>
      <el-dialog :visible="dialogVisibleLogs" @close="closeDialogLogs">
        <keep-alive>
          <Pod_Logs
            v-if="dialogVisibleLogs"
            :key="logsKey"
            :pod_name="pod_name"
          />
        </keep-alive>
      </el-dialog>
      <el-dialog :visible="dialogVisibleRates" @close="closeDialogRates">
        <keep-alive>
          <Pod_Rates
            v-if="dialogVisibleRates"
            :key="ratesKey"
            :pod_name="pod_name"
          />
        </keep-alive>
      </el-dialog>
    </el-main>
  </el-container>
</template>

<script>
import axios from "axios";
import { getContainerInfo, updateContainerInfo } from "@/api/ContainerSpy";
import Pod_Logs from "@/views/SpyCenter/container_spy/pod_logs.vue";
import Pod_Yaml from "@/views/SpyCenter/container_spy/pod_yaml.vue";
import Pod_Rates from "@/views/SpyCenter/container_spy/pod_rates.vue";

export default {
  components: { Pod_Logs, Pod_Yaml, Pod_Rates },
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleLogs: false,
      logsKey: 0,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleRates: false,
      ratesKey: 0,
      // 用于表单搜索
      formInline: {
        name: "",
        status: "",
      },
      // Pod数据测试用
      PodData: [
        {
          pod_id: "1",
          pod_name: "nginx",
          pod_request_cpu: "1",
          pod_request_mem: "100Mi",
          pod_limit_cpu: "1",
          pod_limit_mem: "100Mi",
          pod_status: "Running",
          pod_node: "node1",
          pod_start_time: "2019-06-03 10:00:00",
        },
        {
          pod_id: "2",
          pod_name: "nginx",
          pod_request_cpu: "2",
          pod_request_mem: "100Mi",
          pod_limit_cpu: "2",
          pod_limit_mem: "100Mi",
          pod_status: "Pending",
          pod_node: "node2",
          pod_start_time: "2019-06-03 10:00:00",
        },
        {
          pod_id: "3",
          pod_name: "nginx",
          pod_request_cpu: "3",
          pod_request_mem: "100Mi",
          pod_limit_cpu: "3",
          pod_limit_mem: "100Mi",
          pod_status: "Unknown",
          pod_node: "node2",
          pod_start_time: "2019-06-03 10:00:00",
        },
        {
          pod_id: "4",
          pod_name: "nginx",
          pod_request_cpu: "1",
          pod_request_mem: "100Mi",
          pod_limit_cpu: "1",
          pod_limit_mem: "100Mi",
          pod_status: "Succeeded",
          pod_node: "node1",
          pod_start_time: "2019-06-03 10:00:00",
        },
        {
          pod_id: "5",
          pod_name: "nginx",
          pod_request_cpu: "1",
          pod_request_mem: "100Mi",
          pod_limit_cpu: "1",
          pod_limit_mem: "100Mi",
          pod_status: "Running",
          pod_node: "node1",
          pod_start_time: "2019-06-03 10:00:00",
        },
        {
          pod_id: "6",
          pod_name: "nginx",
          pod_request_cpu: "1",
          pod_request_mem: "100Mi",
          pod_limit_cpu: "1",
          pod_limit_mem: "100Mi",
          pod_status: "Failed",
          pod_node: "node1",
          pod_start_time: "2019-06-03 10:00:00",
        },
      ],
      // 用于传递参数
      pod_name: "",
    };
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      if (this.formInline.name.trim() || this.formInline.status.trim()) {
        return this.PodData.filter((item) => {
          const nameMatch =
            !this.formInline.name.trim() ||
            item.pod_name
              .toLowerCase()
              .includes(this.formInline.name.trim().toLowerCase());
          const statusMatch =
            !this.formInline.status.trim().toLowerCase() ||
            item.pod_status.toLowerCase() ===
              this.formInline.status.trim().toLowerCase();
          return nameMatch && statusMatch;
        });
      }
      return this.PodData.slice(startIndex, endIndex);
    },
  },
  created() {
    this.fetchData();
  },
  mounted() {
    // this.getServerData()
  },
  methods: {
    getServerData() {
      // 这里的path只给了本地测试的时候，如果上传到服务器则需要修改
      const path = "http://127.0.0.1:5000/getContainerSpyInfo";
      axios
        .get(path)
        .then((res) => {
          this.PodData = res.data;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    fetchData() {
      getContainerInfo()
        .then((res) => {
          console.log(res);
          this.PodData = res.result;
        })
        .catch((err) => {
          console.log(err);
        });
    },
    updateData() {
      updateContainerInfo()
        .then((res) => {
          console.log(res);
          this.PodData = res.result;
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
      this.currentPage = 1; // 每次改变每页显示条数时，回到第一页
    },
    handleCurrentChange(val) {
      this.currentPage = val;
    },
    handleEdit(index, row) {
      console.log(index, row);
      this.dialogVisibleYaml = true;
      this.yamlKey = this.yamlKey + 1;
      this.pod_name = row.pod_name;
    },
    closeDialogYaml() {
      this.dialogVisibleYaml = false;
    },
    checkPodRates(index, row) {
      console.log(index, row);
      this.dialogVisibleRates = true;
      this.ratesKey = this.ratesKey + 1;
      this.pod_name = row.pod_name;
    },
    closeDialogRates() {
      this.dialogVisibleRates = false;
    },
    checkPodLogs(index, row) {
      console.log(index, row);
      this.dialogVisibleLogs = true;
      this.logsKey = this.logsKey + 1;
      this.pod_name = row.pod_name;
    },
    closeDialogLogs() {
      this.dialogVisibleLogs = false;
    },
    formatter(row, column) {
      return row.pod_start_time;
    },
    filterTag(value, row) {
      return row.status === value;
    },
    ChooseType(status) {
      if (status === "Running") {
        return "success";
      } else if (status === "Succeeded") {
        return "default";
      } else if (status === "Failed") {
        return "danger";
      } else if (status === "Pending") {
        return "warning";
      } else if (status === "Unknown") {
        return "info";
      }
    },
  },
};
</script>

<style scoped></style>
