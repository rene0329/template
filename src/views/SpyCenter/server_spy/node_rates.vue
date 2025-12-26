<template>
  <el-tabs>
    <el-tab-pane label="使用率信息">
      <el-button type="info" @click="onRefresh">刷新</el-button>
      <div id="chartContainer" />
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { getNodeRates } from '@/api/ServerSpy'
import * as echarts from 'echarts'

export default {
  props: {
    node_name: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      node_rates: [],
      cpuData: [],
      memData: [],
      diskData: [],
      diskReadData: [],
      diskWriteData: [],
      networkDownloadData: [],
      networkUpLoadData: []
    }
  },
  created() {
    this.fetchRates()
  },
  mounted() {
    this.nodeRatesChart = echarts.init(document.getElementById('chartContainer'))
  },
  methods: {
    fetchRates() {
      const post_data = {
        node_name: this.node_name
      }
      getNodeRates(post_data)
        .then(response => {
          this.node_rates = response.result
          // 处理CPU率数据
          this.cpuData = []
          this.node_rates.cpuRateTimely.forEach(item => {
            this.cpuData.push(item[1])
          })
          // 处理内存率数据
          this.memData = []
          this.node_rates.memRateTimely.forEach(item => {
            this.memData.push(item[1])
          })
          // 处理磁盘使用率数据
          this.diskData = []
          this.node_rates.diskRateTimely.forEach(item => {
            this.diskData.push(item[1])
          })
          // 处理磁盘读取速率数据
          this.diskReadData = []
          this.node_rates.diskReadTimely.forEach(item => {
            this.diskReadData.push(item[1])
          })
          // 处理磁盘写入速率数据
          this.diskWriteData = []
          this.node_rates.diskWriteTimely.forEach(item => {
            this.diskWriteData.push(item[1])
          })
          // 处理网络下载速率数据
          this.networkDownloadData = []
          this.node_rates.networkDownloadTimely.forEach(item => {
            this.networkDownloadData.push(item[1])
          })
          // 处理网络上传速率数据
          this.networkUpLoadData = []
          this.node_rates.networkUpLoadTimely.forEach(item => {
            this.networkUpLoadData.push(item[1])
          })
          this.updateChart()
        })
        .catch(error => {
          this.$message({
            message: error,
            type: 'error'
          })
        })
    },
    updateChart() {
      this.xArr = Array(this.cpuData.length)
      for (let i = 0; i < this.xArr.length; i++) {
        this.xArr[i] = i + 1
      }
      this.option = {
        title: {
          text: 'Node节点各项使用率(%)',
          subtext: this.node_name,
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '5%',
          right: '6%',
          bottom: '5%',
          containLabel: true
        },
        legend: {
          orient: 'vertical',
          left: 'right'
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: this.xArr
        },
        yAxis: {
          type: 'value',
          boundaryGap: false
        },
        series: [
          {
            name: 'CPU使用率',
            data: this.cpuData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          },
          {
            name: '内存使用率',
            data: this.memData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          },
          {
            name: '磁盘使用率',
            data: this.diskData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          },
          {
            name: '磁盘读取速率',
            data: this.diskReadData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          },
          {
            name: '磁盘写入速率',
            data: this.diskWriteData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          },
          {
            name: '网络下载速率',
            data: this.networkDownloadData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          },
          {
            name: '网络上传速率',
            data: this.networkUpLoadData,
            type: 'line',
            smooth: true,
            stack: 'Total',
            markPoint: {
              data: [
                { type: 'max', name: 'Max' },
                { type: 'min', name: 'Min' }
              ]
            },
            markLine: {
              data: [{ type: 'average', name: 'Avg' }]
            }
          }
        ]
      }
      console.log(this.option)
      this.nodeRatesChart.setOption(this.option)
    },
    onRefresh() {
      this.fetchRates()
    }
  }
}

</script>

<style>
#chartContainer {
  width: 700px;
  height: 700px;
}
</style>
