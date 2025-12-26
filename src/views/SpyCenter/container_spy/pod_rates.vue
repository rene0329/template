<template>
  <el-tabs>
    <el-tab-pane label="使用率信息">
      <el-button type="info" @click="onRefresh">刷新</el-button>
      <div id="chartContainer" />
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { getPodRates } from '@/api/ContainerSpy'
import * as echarts from 'echarts'

export default {
  props: {
    pod_name: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      pod_rates: [],
      cpuData: [],
      memData: []
    }
  },
  created() {
    this.fetchRates()
  },
  mounted() {
    this.cpuAndMemChart = echarts.init(document.getElementById('chartContainer'))
  },
  methods: {
    fetchRates() {
      const post_data = {
        pod_name: this.pod_name
      }
      getPodRates(post_data)
        .then(response => {
          this.pod_rates = response.result
          // 处理CPU率数据
          this.cpuData = []
          this.pod_rates.cpuRate.forEach(item => {
            this.cpuData.push(item[1])
          })
          // 处理内存率数据
          this.memData = []
          this.pod_rates.memRate.forEach(item => {
            this.memData.push(item[1])
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
          text: 'CPU和内存使用率(%)',
          subtext: this.pod_name
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.xArr,
          boundaryGap: false
        },
        yAxis: {
          type: 'value'
        },
        legend: {},
        series: [
          {
            name: 'CPU',
            data: this.cpuData,
            type: 'line',
            stack: 'Total',
            smooth: true,
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
            name: 'mem',
            data: this.memData,
            type: 'line',
            stack: 'Total',
            smooth: true,
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
      this.cpuAndMemChart.setOption(this.option)
    },
    onRefresh() {
      this.fetchRates()
    }
  }
}

</script>

<style scoped>
#chartContainer {
  width: 800px;
  height: 600px;
}
</style>
