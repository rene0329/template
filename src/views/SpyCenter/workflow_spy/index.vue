<!-- 工作流详情 -->
<template>
  <el-container>
    <el-main>
      <br>
      <br>
      <!-- 信息模块 -->
      <br>
      <el-col :span="24" style="margin: 10px; height: 270px; overflow-x: auto; display: flex; justify-content: center;">
        <el-card style="height: 250px;">
          <el-descriptions>
            <template #title>
              <div>
                <span><i class="el-icon-star-on" /> 编号wf1</span>
                <el-button style="margin-left: 920px;" type="primary" @click="handleEdit(scope.$index, scope.row)">配置</el-button>
              </div>
            </template>
            <el-descriptions-item label="描述">秒速信息详细内容</el-descriptions-item>
            <el-descriptions-item label="启动时间">2017-01-10 11:00</el-descriptions-item>
            <el-descriptions-item label="期望成本">0.6元</el-descriptions-item>
            <el-descriptions-item label="创建时间">2017-01-10 10:00</el-descriptions-item>
            <el-descriptions-item label="期望时间">10秒</el-descriptions-item>
            <el-descriptions-item label="最大成本">0.9元</el-descriptions-item>
            <el-descriptions-item label="截止时间">30秒</el-descriptions-item>
            <el-descriptions-item label="偏好权重">0.0%</el-descriptions-item>
            <el-descriptions-item label="状态">运行中</el-descriptions-item>
            <el-descriptions-item label="订单金额">￥589.3</el-descriptions-item>
          </el-descriptions>
          <br>
        </el-card>
      </el-col>
      <!-- 列表模块 -->
      <el-col :span="24" style="margin-left:30px; margin-right:30px; height:650px;overflow-x:auto;display: flex; justify-content: center;">
        <el-card style="height:600px;">
          <el-row>
            <el-col :span="6" style="width:200px;">
              <el-tabs v-model="activeName" @tab-click="handleClick">
                <el-tab-pane label="详情" name="first" />
                <el-tab-pane label="模板" name="second" />
                <el-tab-pane label="代码" name="third" />
              </el-tabs>
            </el-col>
            <el-col :span="4">
              <el-input v-model="input" placeholder="请输入关键词" style="margin-left: 500px; " prefix-icon="el-icon-search" />
            </el-col>
            <el-col :span="3">
              <el-button style="width: 100px;margin-left: 550px;" type="primary">搜索</el-button>
            </el-col>
            <br>
          </el-row>
          <br><br>
          <div v-if="activeName === 'first'">
            <el-col :span="10">工作流调用日志</el-col>
            <el-table
              :data="ServerData"
              style="width: 100%"
              :default-sort="{prop: 'UpdateTime', order: 'descending'}"
            >
              <el-table-column
                type="selection"
                width="55"
              />
              <el-table-column
                prop="ID"
                label="工作流请求编号"
                width="300"
              />
              <el-table-column
                prop="tag"
                label="执行结果"
                width="200"
                :filters="[{ text: '成功', value: '成功' }, { text: '超时', value: '超时' },{ text: '运行中', value: '运行中'}]"
                :filter-method="filterTag"
                filter-placement="bottom-end"
              >
                <template slot-scope="scope">
                  <!--根据tag值来选择颜色-->
                  <el-tag
                    :type="ChooseType(scope.row.tag)"
                    disable-transitions
                  >{{ scope.row.tag }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="UpdateTime"
                label="完成时间"
                width="300"
                sortable
                :formatter="formatter"
              />
              <el-table-column label="操作" width="150">
                <template slot-scope="scope">
                  <el-button
                    size="mini"
                    type="primary"
                    @click="handleEdit(scope.$index, scope.row)"
                  >查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="activeName === 'second'">
            <el-table :data="templateData" style="width: 100%" :default-sort="{prop: 'finishTime', order: 'descending'}">
              <el-table-column type="selection" width="55" />
              <el-table-column prop="templateName" label="模板名称" width="300" />
              <el-table-column prop="templateStatus" label="模板状态" width="200" />
              <el-table-column prop="finishTime" label="完成时间" width="300" sortable :formatter="formatTime" />
              <el-table-column label="操作" width="150">
                <template slot-scope="scope">
                  <el-button size="mini" type="primary" @click="editTemplate(scope.$index, scope.row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="activeName === 'third'">
            <el-table :data="codeData" style="width: 100%" :default-sort="{prop: 'finishTime', order: 'descending'}">
              <el-table-column type="selection" width="55" />
              <el-table-column prop="codeName" label="代码名称" width="300" />
              <el-table-column prop="codeType" label="代码类型" width="200" />
              <el-table-column prop="finishTime" label="代码最后修改时间" width="300" sortable :formatter="formatTime" />
              <el-table-column label="操作" width="150">
                <template slot-scope="scope">
                  <el-button size="mini" type="primary" @click="editTemplate(scope.$index, scope.row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <br><br>
          <el-footer>
            <div>
              <el-pagination
                :current-page="currentPage1"
                :page-sizes="[10, 20, 30, 40]"
                :page-size="10"
                layout="total, sizes, prev, pager, next, jumper"
                :total="40"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </el-footer>
        </el-card>
      </el-col>
      <br>
      <el-col :span="24" style="margin: 2px; height: 300px; justify-content: center;">
        <el-card style="height:250px;">
          <el-steps :active="1" align-center>
            <el-step title="步骤1" description="这是一段很长很长很长的描述性文字" />
            <el-step title="步骤2" description="这是一段很长很长很长的描述性文字" />
            <el-step title="步骤3" description="这是一段很长很长很长的描述性文字" />
            <el-step title="步骤4" description="这是一段很长很长很长的描述性文字" />
          </el-steps>
        </el-card>
      </el-col>
      <div>
        <el-table :data="jinDuData" style="width: 100%">
          <el-table-column
            prop="zhuangtai"
            label="状态"
          >
            <template scope="scope">
              <span v-if="scope.row.zhuangtai==='进行中'" style="color: green">进行中</span>
              <span v-else-if="scope.row.zhuangtai==='已延期'" style="color: red">已延期</span>
              <span v-else-if="scope.row.zhuangtai==='未开始'" style="color: orange">未开始</span>
              <span v-else style="color:gray"><del>已结束</del></span>
            </template>
          </el-table-column>
          <el-table-column
            prop="progress"
            label="进度"
          >
            <template slot-scope="scope">
              <el-progress
                type="line"
                :text-inside="true"
                :stroke-width="15"
                :percentage="scope.row.progress"
                :color="blue"
              />
            </template>
          </el-table-column>
        </el-table>

      </div>
      <br>
      <br>
      <div>
        <iframe id="faasflowtower" src="http://10.60.150.74:31112/function/faas-flow-dashboard" frameborder="0" />
      </div>
      <br>
      <br>
      <!-- 函数日志列表模块 -->
      <br>
      <br>
      <div>
        <el-col :span="24" style="margin:30px;height:650px;overflow-x:auto;display: flex; justify-content: center;">
          <el-card style="height:600px;">
            <el-row>
              <el-col :span="14">函数日志</el-col>
              <el-col :span="5">
                <el-input v-model="input" placeholder="请输入关键词" style="margin-left: 70px; " prefix-icon="el-icon-search" />
              </el-col>
              <el-col :span="3">
                <el-button style="width: 100px;margin-left: 90px;" type="primary">搜索</el-button>
              </el-col>
            </el-row>
            <br>
            <el-table
              :data="ServerData_func"
              style="width: 100%"
              :default-sort="{prop: 'UpdateTime', order: 'descending'}"
            >
              <el-table-column
                type="selection"
                width="55"
              />
              <el-table-column
                prop="ID"
                label="函数编号"
                width="150"
              />
              <el-table-column
                prop="name"
                label="函数名称"
                width="250"
              />
              <el-table-column
                prop="tag"
                label="执行结果"
                width="200"
                :filters="[{ text: '成功', value: '成功' }, { text: '超时', value: '超时' },{ text: '运行中', value: '运行中'}]"
                :filter-method="filterTag"
                filter-placement="bottom-end"
              >
                <template slot-scope="scope">
                  <!--根据tag值来选择颜色-->
                  <el-tag
                    :type="ChooseType(scope.row.tag)"
                    disable-transitions
                  >{{ scope.row.tag }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="UpdateTime"
                label="完成时间"
                width="300"
                sortable
                :formatter="formatter"
              />
              <el-table-column
                prop="res"
                label="结果"
                width="200"
              />
            </el-table>
            <br>
            <br>
            <el-footer>
              <div class="block" style="text-align: right;margin-right: 50px;">
                <el-pagination
                  :current-page="currentPage1"
                  :page-sizes="[10, 20, 30, 40]"
                  :page-size="10"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="40"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-footer>
          </el-card>
        </el-col>
      </div>
    </el-main>
  </el-container>

</template>

<script>
export default {
  data() {
    return {
      input: '',
      activeName: 'first',
      currentPage1: 5,
      currentPage2: 5,
      currentPage3: 5,
      currentPage4: 4,
      formInline: {
        user: '',
        region: ''
      },
      templateData: [
        { templateName: '模板1', templateType: '类型A', finishTime: '2023-05-01 10:30:20' },
        { templateName: '模板2', templateType: '类型B', finishTime: '2023-05-02 12:15:40' },
        { templateName: '模板3', templateType: '类型A', finishTime: '2023-05-03 15:20:30' },
        { templateName: '模板4', templateType: '类型C', finishTime: '2023-05-04 08:45:10' },
        { templateName: '模板5', templateType: '类型B', finishTime: '2023-05-05 11:25:30' }
      ],
      codeData: [
        { codeName: '代码1', codeType: '类型A', finishTime: '2023-05-01 10:30:20' },
        { codeName: '代码2', codeType: '类型B', finishTime: '2023-05-02 12:15:40' },
        { codeName: '代码3', codeType: '类型A', finishTime: '2023-05-03 15:20:30' },
        { codeName: '代码4', codeType: '类型C', finishTime: '2023-05-04 08:45:10' },
        { codeName: '代码5', codeType: '类型B', finishTime: '2023-05-05 11:25:30' }
      ],
      ServerData: [{
        ID: '1',
        tag: '成功',
        UpdateTime: '2016-05-02 : 12: 00: 00'
      }, {
        ID: '2',
        tag: '超时',
        UpdateTime: '2016-05-02 : 12: 00: 00'
      }, {
        ID: '3',
        tag: '运行中',
        UpdateTime: '2016-05-02 : 12: 00: 00'
      }, {
        ID: '4',
        tag: '成功',
        UpdateTime: '2016-05-02 : 12: 00: 00'
      }, {
        ID: '5',
        tag: '成功',
        UpdateTime: '2016-05-02 : 12: 00: 00'
      }],
      ServerData_func: [{
        ID: 'f1',
        name: '读取数据',
        tag: '成功',
        UpdateTime: '2016-05-02 : 12: 00: 00',
        res: '-'
      }, {
        ID: 'f2',
        name: '读取数据',
        tag: '超时',
        UpdateTime: '2016-05-02 : 12: 00: 00',
        res: '1'
      }, {
        ID: 'f3',
        name: '读取数据',
        tag: '运行中',
        UpdateTime: '2016-05-02 : 12: 00: 00',
        res: '12'
      }, {
        ID: 'f4',
        name: '读取数据',
        tag: '成功',
        UpdateTime: '2016-05-02 : 12: 00: 00',
        res: '-'
      }, {
        ID: 'f5',
        name: '读取数据',
        tag: '成功',
        UpdateTime: '2016-05-02 : 12: 00: 00',
        res: '-'
      }],
      reverse: true,
      jinDuData: [{
        zhuangtai: '进行中',
        progress: 10
      }, {
        zhuangtai: '进行中',
        progress: 90
      }, {
        zhuangtai: '已延期',
        progress: 50
      }, {
        zhuangtai: '已延期',
        progress: 70
      }, {
        zhuangtai: '未开始',
        progress: 100
      }, {
        zhuangtai: '已结束',
        progress: 10
      }, {
        zhuangtai: '已结束',
        progress: 30
      }]
    }
  },
  mounted() {
    /**
    * iframe-宽高自适应显示
    */

    function changeMobsfIframe() {
      const faasflowtower = document.getElementById('faasflowtower')
      const deviceWidth = document.body.clientWidth
      const deviceHeight = document.body.clientHeight
      faasflowtower.style.width = (Number(deviceWidth) - 250) + 'px' // 减去左侧菜单的宽度
      faasflowtower.style.height = (Number(deviceHeight)) + 'px' // 减去顶部菜单的高度
    }

    changeMobsfIframe()

    window.onresize = function() {
      changeMobsfIframe()
    }
  },
  methods: {
    formatTime(row, column, cellValue, index) {
      return this.$moment(cellValue).format('YYYY-MM-DD HH:mm:ss')
    },
    editTemplate(index, row) {
      // 点击编辑模板按钮的逻辑
    },
    onSubmit() {
      console.log('submit!')
    },
    onCancel() {
      console.log('cancel!')
    },
    handleSizeChange(val) {
      console.log(`每页 ${val} 条`)
    },
    handleCurrentChange(val) {
      console.log(`当前页: ${val}`)
    },
    handleEdit(index, row) {
      console.log(index, row)
    },
    handleDelete(index, row) {
      console.log(index, row)
    },
    formatter(row, column) {
      return row.UpdateTime
    },
    filterTag(value, row) {
      return row.tag === value
    },
    ChooseType(tag) {
      if (tag === '成功') {
        return 'success'
      } else if (tag === '超时') {
        return 'danger'
      } else if (tag === '运行中') {
        return 'default'
      }
    }
  }
}
</script>

<style scoped>

</style>
