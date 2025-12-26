<template>
 <div class="app-container">
  <div class="dashboard-container">
    <panel-group @handleSetLineChartData="handleSetLineChartData" />
<template>
  <el-row class="container" :gutter="13" style="padding-top:30px">
    <el-col :span="8" style="margin-top=80px;height:800px;">
      <el-card  style="height:617px;">
        <el-table
          ref="nodeTable"
          :data="nodeList"
          :v-loading="loading"
          highlight-current-row
          @current-change="handleCurrentChange"
          style="width: 100%; ">

          <el-table-column
            property="name"
            label="IP地址"
            prop="nodeList"
            >
            <template slot-scope="scope" >
              {{scope.row.ip}}
            </template>
          </el-table-column>
      </el-table>
      </el-card>
    </el-col>
 <el-col :span="8" style="margin-top=80px;height:800px;">
      <el-card  style="height:617px;">
        <el-table
          ref="nodeTable"
          :data="nodeList"
          :v-loading="loading"
          style="width: 100%; ">

          <el-table-column
            property="name"
            label="对应虚拟机"
            prop="nodeList"
            >
            <template slot-scope="scope" >
              {{scope.row.node}}
            </template>
          </el-table-column>
      </el-table>
      </el-card>
    </el-col>
    <el-col :span="8" style="height:800px;">
      <el-card style="height:617px;">
        <el-table
          class="containerTable"
          :data="podList"
          :v-loading="loading"
          element-loading-text="Loading"
          style="width: 100%; ">

          <el-table-column
            label="函数运行状态"
            prop="podList"
            >
            <template slot-scope="scope" >
              <span v-for="(item,index) in scope.row" :key="index">
              {{item}}
              </span>
              <el-tag type="success" text-align: right>正常运行</el-tag>
            </template>
          </el-table-column>
      </el-table>
      </el-card>
    </el-col>

  </el-row>
</template>
    <!-- <div class="dashboard-text">name: {{ name }}</div> -->
    <!-- <h3>
      请选择要查看的服务
      <p>{{ functionList }}</p>
    </h3>
      <li v-for="func in allFunctionList">
        {{ func }}
    </li> -->
  </div>
  </div>
  </template>

<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import PanelGroup from './PanelGroup'
import { getList } from '@/api/table'
import {getNodeList,getNodeContainers,getNodeRate} from '@/api/container'
import * as echarts from 'echarts'
export default {
  components: {
    PanelGroup
  },
  name: 'Dashboard',
  data() {
      return {
          nodeList:['No data'],
      podList: [],
      currentPod: null,
      currentNode:null,
      cpuData:[[]],
      memData:[[]],
      diskRead:[[]],
      diskWrite:[[]],
      netDown:[[]],
      netUp:[[]],
      keyArray:['cpu占用率','内存占用率','磁盘读速率','磁盘写速率','网络下载速率','网络上传速率'],
        info:null,
        functionList:null,
      list: null,
      listLoading: true,
      allFunctionList: null,
      }
    },
  created() {
    this.fetchData()
    this.getRate()
    this.drawDoubleLine("IO")
    this.drawDoubleLine("network")
    this.setSingleLine()
  },
  methods: {
    getRate(){
      let param = {node:this.currentNode}

      // 查询各类速率 - 一次请求版本
      getNodeRate(param).then(res => {
        this.cpuData = res.cpuRate
        this.memData = res.memRate
        this.diskRead = res.diskRead
        this.diskWrite = res.diskWrite
        this.netDown = res.networkDown
        this.netUp = res.networkUp
        console.log("readRate finished")
      })
    },

    handleCurrentChange(val) {
      this.currentNode = val.node//当前容器所在结点
      let param = {node:this.currentNode}
      getNodeContainers(param).then(response => {
        this.podList = response.pod_name
      })
      this.getRate()
      this.drawDoubleLine("IO")
      this.drawDoubleLine("network")
      this.setSingleLine()
          //成功回调函数停止加载

    },
    fetchData() {
      this.listLoading = true
      getNodeList().then(response => {
        this.nodeList = response.nodes
        this.currentNode = this.nodeList[0].node
        this.$refs.nodeTable.setCurrentRow(this.nodeList[0]);
      })
      this.listLoading = false
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  &-container {
    margin: 30px;
  }
  &-text {
    font-size: 30px;
    line-height: 46px;
  }
}
</style>
