<!--方舱监管模块-->
<template>
  <el-container>
    <el-header style="margin-top: 15px; height: 15px"> 集群监管模块 </el-header>
    <el-main>
      <el-form
        :inline="true"
        :model="formInline"
        class="demo-form-inline"
        size="medium"
      >
        <el-form-item label="集群IP" size="medium">
          <el-input v-model="formInline.IP" placeholder="请输入集群IP" />
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
        :default-sort="{ prop: 'clus_id', order: 'upward' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="clus_id" label="集群编号" width="100" />
        <el-table-column prop="clus_name" label="集群名称" width="150" />
        <!--        <el-table-column-->
        <!--          prop="clus_master_ip"-->
        <!--          label="方舱masterIP"-->
        <!--          width="150"-->
        <!--        />-->
        <el-table-column
          prop="clus_node_num"
          label="集群节点数量"
          sortable
          width="150"
        />
        <el-table-column label="集群node列表" width="150">
          <template slot-scope="scope">
            <el-popover placement="top" width="200" trigger="hover">
              <el-table
                :data="scope.row.clus_node_names"
                style="width: 100%"
                :default-sort="{ prop: 'node_id', order: 'descending' }"
              >
                <el-table-column
                  prop="clus_node_name"
                  label="节点名称"
                  width="150"
                />
              </el-table>
              <el-button slot="reference" size="mini" type="primary"
                >查看</el-button
              >
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column
          prop="clus_namespace_num"
          label="集群命名空间数量"
          sortable
          width="170"
        />
        <el-table-column label="集群命名空间列表" width="150">
          <template slot-scope="scope">
            <el-popover placement="top" width="200" trigger="hover">
              <el-table
                :data="scope.row.clus_namespace_names"
                style="width: 100%"
              >
                <el-table-column
                  prop="clus_namespace_name"
                  label="命名空间名称"
                  width="150"
                />
              </el-table>
              <el-button slot="reference" size="mini" type="primary"
                >查看</el-button
              >
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="primary"
              @click="handleEdit(scope.$index, scope.row)"
              >配置</el-button
            >
            <el-button
              size="mini"
              @click="handleDelete(scope.$index, scope.row)"
              >订阅警报</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-main>
    <el-footer>
      <div class="block" style="text-align: right; margin-right: 140px">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[5, 10, 20, 30, 40]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="ClusterData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
  </el-container>
</template>

<script>
import { getClusterSpyInfo, updateClusterSpyInfo } from "@/api/ClusterSpy";

export default {
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      formInline: {
        IP: "",
      },
      // ClusterData测试用
      ClusterData: [
        {
          clus_id: "1",
          clus_master_ip: "192.168.1.2",
          clus_node_num: "3",
          clus_node_list: [
            {
              clus_node_id: "1",
              clus_node_ip: "192.168.1.3",
            },
            {
              clus_node_id: "2",
              clus_node_ip: "192.168.1.4",
            },
          ],
          clus_namespace_num: "2",
          clus_namespace_list: [
            {
              clus_namespace_name: "default",
            },
            {
              clus_namespace_name: "kube-system",
            },
          ],
          clus_status: "运行中",
        },
      ],
    };
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      if (this.formInline.IP.trim()) {
        return this.ClusterData.filter((item) => {
          const IPMatch =
            !this.formInline.IP.trim() ||
            item.clus_master_ip
              .toLowerCase()
              .includes(this.formInline.IP.trim().toLowerCase());
          return IPMatch;
        });
      }
      return this.ClusterData.slice(startIndex, endIndex);
    },
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      getClusterSpyInfo()
        .then((response) => {
          console.log(response);
          this.ClusterData = response.result;
          this.ClusterData[0].clus_name = "FederalCabin";
        })
        .catch((error) => {
          console.log(error);
        });
    },
    updateData() {
      const data = {
        clus_master_ip: "10.60.150.74",
        clus_config_path: "ProjectManager\\resource\\kubeconfig.yml",
      };
      updateClusterSpyInfo(data)
        .then((response) => {
          console.log(response);
          this.ClusterData = response.result;
        })
        .catch((error) => {
          console.log(error);
        });
    },
    onSearch() {
      this.currentPage = 1;
    },
    onCancel() {
      this.formInline.IP = "";
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
    },
    handleDelete(index, row) {
      console.log(index, row);
    },
    formatter(row, column) {
      return row.cluster_update_time;
    },
  },
};
</script>

<style scoped></style>
