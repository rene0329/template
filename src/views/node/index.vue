<!-- 服务器模块 -->
<template>
  <el-row class="container" :gutter="13" style="padding-top:20px; margin:0 auto">
    <el-col :span="4" style="margin-top:80px;height:800px;">
      <el-card style="height:617px;">
        <el-table
          ref="nodeTable"
          :data="nodeList"
          :v-loading="loading"
          highlight-current-row
          style="width: 100%;overflow:visible; "
          @current-change="handleCurrentChange"
        >

          <el-table-column
            property="name"
            label="服务器列表"
            prop="nodeList"
          >
            <template slot-scope="scope">
              {{ scope.row.node }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>

    <el-col :span="4" style="height:800px;">
      <el-card style="height:617px;">
        <el-table
          class="containerTable"
          :data="podList"
          :v-loading="loading"
          element-loading-text="Loading"
          style="width: 100%; "
        >

          <el-table-column
            label="内部容器列表"
            prop="podList"
          >
            <template slot-scope="scope">
              <span v-for="(item,index) in scope.row" :key="index">{{ item }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>

    <el-col :span="8">
      <el-card id="cpuLine" style="height:300px;">
        <div ref="cpuLine" style="height:300px;" />
        <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
      </el-card>
      <el-card id="memLine" style=" height:300px;margin-top:20px;">
        <div ref="memLine" style="height:300px" />
        <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
      </el-card>
    </el-col>
    <el-col :span="8">
      <el-card id="IOLine" style="height:300px;">
        <div ref="IOLine" style="height:300px" />
        <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
      </el-card>
      <el-card id="netLine" style=" height:300px;margin-top:20px;">
        <div ref="netLine" style="height:300px" />
        <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
      </el-card>
    </el-col>

  </el-row>

</template>

<script>
import { getNodeList, getNodeContainers, getNodeRate } from '@/api/container'
import * as echarts from 'echarts'

export default {
  data() {
    return {
      nodeList: ['No data'],
      podList: [],
      currentPod: null,
      currentNode: null,
      cpuData: [[]],
      memData: [[]],
      diskRead: [[]],
      diskWrite: [[]],
      netDown: [[]],
      netUp: [[]],
      keyArray: ['cpu占用率', '内存占用率', '磁盘读速率', '磁盘写速率', '网络下载速率', '网络上传速率'],
      updateST: null, // 轮询计时对象
      cpuLine: null,
      memLine: null,
      IOLine: null,
      netLine: null
    }
  },
  created() {
    this.fetchData()
    this.getRate()
    this.drawDoubleLine('IO')
    this.drawDoubleLine('network')
    this.setSingleLine()
  },
  mounted() {
    this.initChart()
  },
  destroyed() {
    clearTimeout(this.updateST)
  },
  methods: {
    initChart() {
      this.cpuLine = echarts.init(this.$refs.cpuLine)
      this.memLine = echarts.init(this.$refs.memLine)
      this.IOLine = echarts.init(this.$refs.IOLine)
      this.netLine = echarts.init(this.$refs.netLine)
    },
    // 双标签折线图
    drawDoubleLine(A_data, A_label, B_data, B_label, myLine) {
      const series = []

      series.push({
        name: A_label,
        data: A_data,
        type: 'line',
        areaStyle: {}

      })
      series.push({
        name: B_label,
        data: B_data,
        type: 'line',
        areaStyle: {}

      })

      const option = {
        xAxis: {
          type: 'time',
          name: '60s',
          show: false // 不显示坐标轴上的文字

        },
        yAxis: {
          name: '%'
          // min:0,
          // max:100
        },
        legend: {
          data: [A_label, B_label]
        },
        tooltip: {
          show: true
        },
        series
      }

      myLine.setOption(option)
    },
    // 单标签折线图
    drawSingleLine(myLabel, myData, myLine) {
      const series = []
      series.push({
        name: myLabel,
        type: 'line',
        data: myData,
        areaStyle: {},
        smooth: 'true'
      })

      const option = {
        xAxis: {
          type: 'time',
          name: '60s',
          show: false // 不显示坐标轴上的文字

        },
        yAxis: {
          type: 'value',
          name: '%'
        },
        legend: {
          data: [myLabel]
        },
        tooltip: {
          show: true
        },
        series
      }

      myLine.setOption(option)
    },
    // 更新折线图
    updateChart() {
      this.drawSingleLine(this.keyArray[0], this.cpuData, this.cpuLine)
      this.drawSingleLine(this.keyArray[1], this.memData, this.memLine)
      this.drawDoubleLine(this.diskRead, this.keyArray[2], this.diskWrite, this.keyArray[3], this.IOLine)
      this.drawDoubleLine(this.netDown, this.keyArray[4], this.netUp, this.keyArray[5], this.netLine)
    },
    // 轮询方法
    startInterval(param) {
      getNodeRate(param).then(res => {
        // 数据处理
        this.cpuData = res.cpuRate
        this.memData = res.memRate
        this.diskRead = res.diskRead
        this.diskWrite = res.diskWrite
        this.netDown = res.networkDown
        this.netUp = res.networkUp
        this.updateChart()
        this.updateST = setTimeout(() => {
          clearTimeout(this.updateST)
          this.startInterval(param)
        }, 1000)
      })
    },
    handleCurrentChange(val) {
      this.currentNode = val.node// 当前容器所在结点
      const param = { node: this.currentNode }
      // 获取容器列表
      getNodeContainers(param).then(response => {
        this.podList = response.pod_name
      })

      clearTimeout(this.updateST)
      this.startInterval(param)
    },
    fetchData() {
      this.listLoading = true
      getNodeList().then(response => {
        this.nodeList = response.nodes
        this.currentNode = this.nodeList[0].node
        this.$refs.nodeTable.setCurrentRow(this.nodeList[0])
      })
      this.listLoading = false
    }
  }
}
</script>
