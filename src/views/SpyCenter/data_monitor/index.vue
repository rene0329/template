<!--函数监管模块-->
<template>
  <el-container>
    <el-header style="margin-top: 15px; height: 15px"> 状态数据监管模块 </el-header>
    <div class="TwoChartContainer">
      <div class="temperature-chart">
        <TemperatureChart />
      </div>
      <div class="data-pos-chart">
        <DataPosChart />
      </div>
    </div>
    <el-main>
      <el-form :inline="true" :model="formInline" class="demo-form-inline" size="medium">
        <el-form-item label="数据名称" size="medium">
          <el-input v-model="formInline.name" placeholder="请输入" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onCancel">取消</el-button>
          <el-button type="info" @click="onRefresh">刷新</el-button>
          <el-button @click="DataCreate">数据创建</el-button>
          <el-button @click="DataDelete">数据删除</el-button>
          <el-button @click="DataTrans">数据迁移</el-button>
        </el-form-item>
      </el-form>
      <el-table
        ref="dataTable"
        :data="currentPageData"
        style="width: 100%"
        :default-sort="{ prop: 'data_id', order: 'upward' }"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="data_id" label="编号" width="100" sortable align="center" />
        <el-table-column prop="data_name" label="数据名称" width="200" align="center" />
        <el-table-column prop="data_func" label="绑定函数" width="150" align="center" />
        <el-table-column prop="data_provider" label="数据提供者" width="150" align="center" />
        <el-table-column prop="data_size" label="数据大小(B)" sortable width="150" align="center" />
        <el-table-column prop="data_type" label="数据类型" width="100" align="center" />
        <el-table-column
          prop="data_status"
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
            <el-tag
              :type="ChooseType(scope.row.data_status)"
            >{{ scope.row.data_status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template slot-scope="scope">
            <div style="display: flex">
              <el-button
                size="mini"
                @click="checkDataDetail(scope.$index, scope.row)"
              >查看具体信息</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-dialog :visible="dialogVisibleDetail" @close="closeDialogDetail">
        <Data_Detail_Info v-if="dialogVisibleDetail" :key="dataKey" :single-data="single_data" />
      </el-dialog>
    </el-main>
    <el-footer>
      <div class="block" style="text-align: right; margin-right: 50px">
        <el-pagination
          :current-page="currentPage"
          :page-sizes="[5, 10, 20, 30, 40]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="dataData.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-footer>
    <el-dialog v-if="showCreateForm" :visible="showCreateForm" @close="CreateCancel">
      <el-form :model="createForm">
        <el-form-item label="数据名称">
          <el-input v-model="createForm.data_name" />
        </el-form-item>
        <el-form-item label="数据位置">
          <el-select v-model="createForm.data_location" placeholder="请选择数据位置">
            <el-option label="node1" value="node1"></el-option>
            <el-option label="node2" value="node2"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="绑定函数">
          <el-select v-model="createForm.data_func" placeholder="请选择函数">
            <el-option
              v-for="item in func_data"
              :key="item.func_name"
              :label="item.func_name"
              :value="item.func_name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数据内容">
          <!-- 上传文件按钮 -->
          <el-upload
            action=""
            :on-change ="handleFileUpload"
            :auto-upload="false"
            accept=".txt"
          >
            <el-button slot="trigger" type="primary">选择文件</el-button>
          </el-upload>

          <!-- 文本区域显示文件内容 -->
          <el-input v-model="createForm.data_content" type="textarea" rows="10" />
        </el-form-item>

        <el-button type="primary" @click="CreateSubmit">确定</el-button>
        <el-button @click="CreateCancel">取消</el-button>
      </el-form>
    </el-dialog>
    <el-dialog v-if="showDeleteForm" :visible="showDeleteForm" @close="DeleteCancel">
      <el-form :model="deleteForm">
        <el-form-item label="数据名称">
          <el-input v-model="deleteForm.data_name" disabled />
        </el-form-item>
        <el-button type="primary" @click="DeleteSubmit">确定</el-button>
        <el-button @click="DeleteCancel">取消</el-button>
      </el-form>
    </el-dialog>
    <el-dialog v-if="showTransForm" :visible="showTransForm" @close="TransCancel">
      <el-form :model="transForm">
        <el-form-item label="数据名字">
          <el-input v-model="transForm.data_name" disabled />
        </el-form-item>
        <el-form-item label="源位置">
          <el-input v-model="transForm.source_location" disabled />
        </el-form-item>
        <el-form-item label="目标位置">
            <el-select v-model="transForm.target_location" placeholder="请选择目标位置">
            <el-option label="node1" value="node1"></el-option>
            <el-option label="node2" value="node2"></el-option>
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="TransSubmit">确定</el-button>
        <el-button @click="TransCancel">取消</el-button>
      </el-form>
    </el-dialog>
  </el-container>
</template>

<script>
import TemperatureChart from '@/views/SpyCenter/data_monitor/temperature_chart.vue'
import { getFuncInfo, updateFuncInfo, deleteFunc } from '@/api/FuncSpy'
import DataPosChart from '@/views/SpyCenter/data_monitor/data_pos_chart.vue'
import { getDataMonitorInfo, updateDataMonitorInfo, createDataMonitorData, deleteDataMonitorData, transferDataMonitorData } from '@/api/DataMonitor'
import Data_Detail_Info from '@/views/SpyCenter/data_monitor/data_detail_info.vue'

export default {
  components: { TemperatureChart, DataPosChart, Data_Detail_Info },
  data() {
    return {
      currentPage: 1,
      pageSize: 5,
      dialogVisibleDetail: false,
      dataKey: 0,
      // 用于表单搜索
      formInline: {
        name: ''
      },
      func_data:[],
      dataData: [
        {
          data_id: 1,
          data_name: 'data1',
          data_provider: 'provider1',
          data_size: 100,
          data_type: 'type1',
          data_status: 'Ready',
          data_location: 'location1',
          data_heat: '热'
        },
        {
          data_id: 2,
          data_name: 'data2',
          data_provider: 'provider2',
          data_size: 200,
          data_type: 'type2',
          data_status: 'NotReady',
          data_location: 'location2',
          data_heat: '冷'
        },
        {
          data_id: 3,
          data_name: 'data3',
          data_provider: 'provider3',
          data_size: 300,
          data_type: 'type3',
          data_status: 'Ready',
          data_location: 'location3',
          data_heat: '温'
        },
        {
          data_id: 4,
          data_name: 'data4',
          data_provider: 'provider4',
          data_size: 400,
          data_type: 'type4',
          data_status: 'NotReady',
          data_location: 'location4',
          data_heat: '热'
        }
      ],
      // 用于传递参数
      single_data: [],
      showCreateForm: false,
      createForm: {
        data_name: '',
        data_location: '',
        data_content: '',
        data_func: '',
      },
      showDeleteForm: false,
      deleteForm: {
        data_name: ''
      },
      showTransForm: false,
      transForm: {
        data_name: '',
        source_location: '',
        target_location: ''
      }
    }
  },
  computed: {
    currentPageData() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      if (this.formInline.name.trim()) {
        const keyword = this.formInline.name.trim().toLowerCase()
        return this.dataData.filter((item) => {
          const nameMatch =
            !this.formInline.name.trim() ||
            item.func_name.toLowerCase().includes(keyword)
          return nameMatch
        })
      }
      return this.dataData.slice(startIndex, endIndex)
    }
  },
  created() {
    this.fetchData()
  },

  mounted() {},
  methods: {
    fetchData() {
      getDataMonitorInfo()
        .then((res) => {
          this.dataData = res.data
        })
        .catch((err) => {
          console.log(err)
        })
      getFuncInfo()
        .then(res => {
          console.log(res)
          this.func_data = res.result
        })
        .catch(err => {
          console.log(err)
        })
    },
    updateData() {
      updateDataMonitorInfo()
        .then((res) => {
          console.log(res)
          this.fetchData()
        })
        .catch((err) => {
          console.log(err)
        })
    },
    onSearch() {
      this.currentPage = 1 // 每次搜索时，回到第一页
    },
    onCancel() {
      this.formInline.name = ''
      this.currentPage = 1 // 每次取消搜索时，回到第一页
    },
    onRefresh() {
      this.updateData()
    },
    DataCreate() {
      this.showCreateForm = true
    },
    CreateSubmit() {
      console.log(this.createForm)
      const post_data = {
        data: this.createForm
      }
      createDataMonitorData(post_data)
        .then((res) => {
          console.log(res)
          if (res.code === 200) {
            this.$message({
              message: '数据创建成功',
              type: 'success'
            })
            this.fetchData()
          } else {
            this.$message({
              message: '数据创建失败',
              type: 'error'
            })
          }
        })
        .catch((err) => {
          console.log(err)
        })
      this.showCreateForm = false
    },
    CreateCancel() {
      this.showCreateForm = false
    },
    DataDelete() {
      // 判断selected是否被选上
      const selected = this.$refs.dataTable.selection
      if (selected.length === 0) {
        this.$message({
          message: '请选择要删除的数据',
          type: 'warning'
        })
        return
      } else if (selected.length > 1) {
        this.$message({
          message: '只能选择一条数据进行删除',
          type: 'warning'
        })
        return
      }
      this.showDeleteForm = true
      this.deleteForm.data_name = selected[0].data_name
    },
    DeleteSubmit() {
      console.log(this.deleteForm)
      const post_data = {
        data: this.deleteForm
      }
      deleteDataMonitorData(post_data)
        .then((res) => {
          console.log(res)
          if (res.code === 200) {
            this.$message({
              message: '数据删除成功',
              type: 'success'
            })
            this.fetchData()
          } else {
            this.$message({
              message: '数据删除失败',
              type: 'error'
            })
          }
        })
        .catch((err) => {
          console.log(err)
        })
      this.showDeleteForm = false
    },
    DeleteCancel() {
      this.showDeleteForm = false
    },
    DataTrans() {
      // 判断selected是否被选上
      const selected = this.$refs.dataTable.selection
      if (selected.length === 0) {
        this.$message({
          message: '请选择要迁移的数据',
          type: 'warning'
        })
        return
      } else if (selected.length > 1) {
        this.$message({
          message: '只能选择一条数据进行迁移',
          type: 'warning'
        })
        return
      }
      this.showTransForm = true
      console.log(selected[0].data_location)
      this.transForm.source_location = selected[0].data_location
      this.transForm.data_name = selected[0].data_name
    },
    TransSubmit() {
      console.log(this.transForm)

      const post_data = {
        data: this.transForm
      }
      transferDataMonitorData(post_data)
        .then((res) => {
          console.log(res)
          if (res.code === 200) {
            this.$message({
              message: '数据迁移成功',
              type: 'success'
            })
            this.fetchData()
          } else {
            this.$message({
              message: '数据迁移失败',
              type: 'error'
            })
          }
          this.$message({
            message: '数据迁移成功',
            type: 'success'
          })
        })
        .catch((err) => {
          console.log(err)
        })
      this.showTransForm = false
    },
    TransCancel() {
      this.showTransForm = false
    },
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1 // 每次改变每页显示条数时，回到第一页
    },
    handleCurrentChange(val) {
      this.currentPage = val
    },
    checkDataDetail(index, row) {
      console.log(index, row)
      this.dialogVisibleDetail = true
      this.dataKey = this.dataKey + 1
      // temp 为 row 的拷贝
      const temp = { ...row }
      this.single_data.push(temp)
    },
    closeDialogDetail() {
      this.dialogVisibleDetail = false
      this.single_data = []
    },
    filterTag(value, row) {
      return row.data_status === value
    },
    ChooseType(data_status) {
      if (data_status === 'Ready') {
        return 'success'
      } else if (data_status === 'NotReady') {
        return 'danger'
      }
    },
    handleFileUpload(file) {
      console.log("文件已选择，handleFileChange 被调用");
      const selectedFile = file.raw;  // 确保获取原始文件对象

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.createForm.data_content = event.target.result;
          console.log("文件内容:", this.createForm.data_content);
        };

        reader.readAsText(selectedFile);  // 读取文件内容
      } else {
        console.error("未能获取到文件的 raw 属性");
      }
    },
  }
}
</script>

<style scoped>
.TwoChartContainer {
  display: flex;
}

.temperature-chart {
  flex: 6.5; /* 占据宽度的 65% */
}

.data-pos-chart {
  flex: 3.5; /* 占据宽度的 35% */
}
</style>
