<!--服务器监管模块-->
<template>
  <el-container>
    <el-header style="margin-top:15px;height: 15px">
      服务器(node节点)监管模块
    </el-header>
    <el-main>
      <el-form :inline="true" :model="formInline" class="demo-form-inline" size="medium">
        <el-form-item label="服务器编号" size="medium">
          <el-input v-model="formInline.name" placeholder="请输入服务器编号" />
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
        :default-sort="{prop: 'node_id', order: 'upward'}"
      >
        <el-table-column
          type="selection"
          width="55"
        />
        <el-table-column
          prop="node_id"
          label="节点编号"
          width="100"
        />
        <el-table-column
          prop="node_name"
          label="节点名称"
          width="100"
        />
        <el-table-column
          prop="node_role"
          label="节点角色"
          width="100"
        />
        <el-table-column
          label="节点配置"
          width="150"
        >
          <template slot-scope="scope">
            <el-popover
              placement="top"
              width="200"
              trigger="hover"
            >
              <el-table
                :data="[scope.row]"
                style="width: 100%"
              >
                <el-table-column
                  prop="node_cpu_capacity"
                  label="节点cpu容量"
                  width="100"
                />
                <el-table-column
                  prop="node_mem_capacity"
                  label="节点mem容量"
                  width="100"
                />
                <el-table-column
                  prop="node_ephemeral_storage"
                  label="节点临时存储空间"
                  width="100"
                />
                <el-table-column
                  prop="node_pod_set"
                  label="节点pod数量限制"
                  width="100"
                />
              </el-table>
              <el-button slot="reference" size="mini" type="primary">查看</el-button>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column
          prop="node_pod_num"
          label="节点含pod数量"
          sortable
          width="140"
        />
        <el-table-column
          label="节点pod列表"
          width="140"
        >
          <template slot-scope="scope">
            <el-popover
              placement="top"
              width="300"
              trigger="hover"
            >
              <el-table
                :data="scope.row.node_pod_list"
                style="width: 100%"
                height="250"
              >
                <el-table-column
                  prop="node_pod_name"
                  label="节点pod名称"
                  width="150"
                />
              </el-table>
              <el-button slot="reference" size="mini" type="primary">查看</el-button>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column
          prop="node_status"
          label="节点状态"
          width="150"
          :filters="[{ text: 'Ready', value: 'Ready' }]"
          :filter-method="filterTag"
          filter-placement="bottom-end"
        >
          <template slot-scope="scope">
            <!--根据tag值来选择颜色-->
            <el-tag
              :type="ChooseType(scope.row.node_status)"
              disable-transitions
            >{{ scope.row.node_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="node_status_is_ready"
          label="可信"
          width="100"
        />
        <el-table-column
          prop="node_update_time"
          label="更新时间"
          width="200"
          sortable
          :formatter="formatter"
        />
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="primary"
              @click="handleEdit(scope.$index, scope.row)"
            >配置</el-button>
            <el-button
              size="mini"
              @click="checkNodeRates(scope.$index, scope.row)"
            >查看使用率</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-main>
    <el-footer>
      <div class="block" style="text-align: right;margin-right: 50px;">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[5, 10, 20, 30, 40]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="NodeData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
    <el-dialog :visible="dialogVisibleYaml" @close="closeDialogYaml">
      <keep-alive>
        <Node_Yaml v-if="dialogVisibleYaml" :key="yamlKey" :node_name="node_name" />
      </keep-alive>
    </el-dialog>
    <el-dialog :visible="dialogVisibleRates" @close="closeDialogRates">
      <keep-alive>
        <Node_Rates v-if="dialogVisibleRates" :key="ratesKey" :node_name="node_name" />
      </keep-alive>
    </el-dialog>
  </el-container>
</template>

<script>
import axios from 'axios'
import { getServerInfo, updateServerInfo } from '@/api/ServerSpy'
import Node_Yaml from './node_yaml.vue'
import Node_Rates from './node_rates.vue'
export default {
  components: { Node_Yaml, Node_Rates },
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleYaml: false,
      yamlKey: 0,
      dialogVisibleRates: false,
      ratesKey: 0,
      formInline: {
        name: ''
      },
      // NodeData测试用
      NodeData: [
        {
          node_id: 1,
          node_name: 'node1',
          node_role: 'master',
          node_cpu_capacity: '8核',
          node_mem_capacity: '16G',
          node_ephemeral_storage: '4G',
          node_pod_set: '10',
          node_num_of_pods: '5',
          node_pod_list: [
            {
              node_pod_id: '1',
              node_pod_name: 'pod1'
            },
            {
              node_pod_id: '2',
              node_pod_name: 'pod2'
            }
          ],
          node_status: '运行中',
          node_update_time: '2020-5-20 12:00:00'
        },
        {
          node_id: 2,
          node_name: 'node2',
          node_role: 'slave',
          node_cpu_capacity: '8核',
          node_mem_capacity: '16G',
          node_ephemeral_storage: '4G',
          node_pod_set: '10',
          node_num_of_pods: '5',
          node_pod_list: [
            {
              node_pod_id: '4',
              node_pod_name: 'pod4'
            },
            {
              node_pod_id: '5',
              node_pod_name: 'pod5'
            }
          ],
          node_status: '运行中',
          node_update_time: '2020-5-20 12:00:00'
        },
        {
          node_id: 3,
          node_name: 'node3',
          node_role: 'slave',
          node_cpu_capacity: '8核',
          node_mem_capacity: '16G',
          node_ephemeral_storage: '4G',
          node_pod_set: '10',
          node_num_of_pods: '5',
          node_pod_list: [
            {
              node_pod_id: '1',
              node_pod_name: 'pod1'
            },
            {
              node_pod_id: '2',
              node_pod_name: 'pod2'
            }
          ],
          node_status: '运行中',
          node_update_time: '2020-5-20 12:00:00'
        },
        {
          node_id: 4,
          node_name: 'node4',
          node_role: 'slave',
          node_cpu_capacity: '8核',
          node_mem_capacity: '16G',
          node_ephemeral_storage: '4G',
          node_pod_set: '10',
          node_num_of_pods: '5',
          node_pod_list: [
            {
              node_pod_id: '1',
              node_pod_name: 'pod1'
            },
            {
              node_pod_id: '2',
              node_pod_name: 'pod2'
            }
          ],
          node_status: '运行中',
          node_update_time: '2020-5-20 12:00:00'
        },
        {
          node_id: 5,
          node_name: 'node5',
          node_role: 'slave',
          node_cpu_capacity: '8核',
          node_mem_capacity: '16G',
          node_ephemeral_storage: '4G',
          node_pod_set: '10',
          node_num_of_pods: '5',
          node_pod_list: [
            {
              node_pod_id: '1',
              node_pod_name: 'pod1'
            },
            {
              node_pod_id: '2',
              node_pod_name: 'pod2'
            }
          ],
          node_status: '运行中',
          node_update_time: '2020-5-20 12:00:00'
        }
      ],
      // 用于传递参数
      node_name: ''
    }
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      if (this.formInline.name.trim()) {
        return this.NodeData.filter(item => {
          const nameMatch = !this.formInline.name.trim() || item.node_name.toLowerCase().includes(this.formInline.name.trim().toLowerCase())
          return nameMatch
        })
      }
      return this.NodeData.slice(startIndex, endIndex)
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    // this.getServerData()
  },
  methods: {
    getServerData() {
      // 这里的path只给了本地测试的时候，如果上传到服务器则需要修改
      const path = 'http://127.0.0.1:5000/getServerSpyInfo'
      axios.get(path)
        .then((res) => {
          this.NodeData = res.data
        })
        .catch((err) => {
          console.log(err)
        })
    },
    fetchData() {
      getServerInfo()
        .then(res => {
          console.log(res)
          this.NodeData = res.result
        })
        .catch(err => {
          console.log(err)
        })
    },
    updateData() {
      updateServerInfo()
        .then(res => {
          console.log(res)
          this.NodeData = res.result
        })
        .catch(err => {
          console.log(err)
        })
    },
    onSearch() {
      this.currentPage = 1
    },
    onCancel() {
      this.formInline.name = ''
      this.currentPage = 1
    },
    onRefresh() {
      console.log('refresh!')
      this.updateData()
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
    },
    handleCurrentChange(val) {
      this.currentPage = val
    },
    handleEdit(index, row) {
      console.log(index, row)
      this.dialogVisibleYaml = true
      this.yamlKey = this.yamlKey + 1
      this.node_name = row.node_name
    },
    closeDialogYaml() {
      this.dialogVisibleYaml = false
    },
    checkNodeRates(index, row) {
      console.log(index, row)
      this.dialogVisibleRates = true
      this.ratesKey = this.ratesKey + 1
      this.node_name = row.node_name
    },
    closeDialogRates() {
      this.dialogVisibleRates = false
    },
    formatter(row, column) {
      return row.node_update_time
    },
    filterTag(value, row) {
      return row.node_status === value
    },
    ChooseType(server_state) {
      if (server_state === 'Ready') {
        return 'success'
      }
    }
  }
}
</script>

<style scoped>

</style>

