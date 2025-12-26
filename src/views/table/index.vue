<template>
  <div class="mixin-components-container">

    <div slot="header" class="clearfix">
      <h3>please select a function</h3>
    </div>
    <template>
      <div class="app-container">
        <el-input v-model="filterText" placeholder="Filter keyword" style="margin-bottom:10px;" @change="search" />
      </div>
    </template>
    <template v-if="showSearch">
      <span>
        搜索结果
      </span>
      <br>
      <el-button
        type="success"
        effect="dark"
        @click="onClick(toShow)"
      >
        {{ toShow+"  " }}
      </el-button>

    </template>
    <el-divider />
    <el-button
      v-for="item in allFunctionList"
      :key="item"
      type="success"

      effect="dark"
      @click="onClick(item)"
    >
      {{ item +"  " }}
    </el-button>

    <div class="description">
      <br>
      <br>
      <el-table
        :data="tableData"
        stripe
        style="width: 100%"
      >
        <el-table-column
          prop="loc"
          label="镜像位置"
          width="180"
        />
        <el-table-column
          prop="success"
          label="调用成功次数"
          width="180"
        />
        <el-table-column
          prop="error"
          label="调用失败次数"
          width="180"
        />
        <el-table-column
          prop="copyNum"
          label="副本个数"
        />
        <el-table-column
          prop="ft"
          label="平均运行时间"
        />
        <el-table-column
          prop="rt"
          label="平均响应时间"
        />
        <el-table-column
          prop="nod"
          label="所在node"
        />
      </el-table>
    </div>

    <div>

      <template>
        <el-row class="container" :gutter="20" style="padding-top:30px">
          <el-col :span="8" style="margin-top:20px; height:800px;">

            <el-card>
              <h3 style="color:grey">日志
              </h3>
              <span v-html="log" />

            </el-card>
          </el-col>

          <el-card style="height:500px;margin-top:0px;" :span="3">
            <div ref="cpuLine" style="height:250px" />
            <div style="margin-top:-55px;margin-right:-80px;font-size: 13px;">  0 - 60</div>
            <div ref="memLine" style="height:250px" />
            <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
          </el-card>

          <!-- </el-col> -->

        </el-row>
      </template>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import LineChart from './components/LineChart'
import RaddarChart from './components/RaddarChart'
import PieChart from './components/PieChart'
import BarChart from './components/BarChart'
import PanelGroup from './components/PanelGroup'
import { getContainerList, getCpuMemRate } from '@/api/container'
import { getFuncList, getLog } from '@/api/func'
import * as echarts from 'echarts'
Date.prototype.Format = function(fmt) {
  var o = {
    'M+': this.getMonth() + 1, // 月份
    'd+': this.getDate(), // 日
    'h+': this.getHours(), // 小时
    'm+': this.getMinutes(), // 分
    's+': this.getSeconds(), // 秒
    'q+': Math.floor((this.getMonth() + 3) / 3), // 季度
    'S': this.getMilliseconds() // 毫秒
  }
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
  for (var k in o) { if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length))) }
  return fmt
}

export default {
  components: {
    LineChart,
    RaddarChart,
    PieChart,
    BarChart
  },
  data() {
    return {
      log: null,
      toShow: null,
      showSearch: false,
      filterText: null,
      podList: [],
      currentPod: null,
      currentNode: null,
      cpuData: null,
      memData: null,
      cpuLine: null,
      memLine: null,
      keyArray: ['cpu占用率', '内存占用率'],
      updateST: null, // 轮询计时对象
      flag: false,
      funcY: {},
      lineChartData: {},
      allFunctionList: null,
      allFunctionMap: null,
      funcInfo: null,
      curFuc: null,
      dynamicFuncInfo: null,
      items: [
        { type: '', label: '标签一' },
        { type: 'success', label: '标签二' },
        { type: 'info', label: '标签三' },
        { type: 'danger', label: '标签四' },
        { type: 'warning', label: '标签五' }
      ],
      tableData: [{
        loc: '',
        success: '',
        error: '',
        copyNum: null,
        ft: '',
        rt: '',
        nod: ''
      }]

    }
  },
  created() {
    this.fetchData()
    this.getAllFunction()
    // this.getFunctionInfo('add')
    // this.getFunctionInfo('errlog')
    // this.getFunctionInfo('nodeinfo')
    // this.getFunctionInfo('test')
  },
  mounted() {
    this.initChart()
    axios
      .get('http://10.60.150.74:5000/global/functions')
      .then(response => (this.functionList = response.data.func))
      .catch(function(error) { // 请求失败处理
        console.log(error)
      })
  },
  destroyed() {
    clearTimeout(this.updateST)
  },
  methods: {
    getFuncY() {
      var cpuR = []
      var memR = []
      for (var i = 0; i < this.dynamicFuncInfo.get(this.curFuc).cpuRate.length; i++) {
        cpuR[i] = this.dynamicFuncInfo.get(this.curFuc).cpuRate[i][0]
        memR[i] = this.dynamicFuncInfo.get(this.curFuc).memRate[i][0]
      }
      this.funcY.cpuR = cpuR
      this.funcY.memR = memR
      this.flag = true
    },
    getTabelData() {
      this.tableData[0].loc = this.allFunctionMap.get(this.curFuc).image
      this.tableData[0].success = this.allFunctionMap.get(this.curFuc).invocations.success
      this.tableData[0].error = this.allFunctionMap.get(this.curFuc).invocations.error
      this.tableData[0].copyNum = this.allFunctionMap.get(this.curFuc).replicas
      this.tableData[0].ft = this.dynamicFuncInfo.get(this.curFuc).func_time
      this.tableData[0].rt = this.dynamicFuncInfo.get(this.curFuc).request_time
      this.tableData[0].nod = this.dynamicFuncInfo.get(this.curFuc).nod
    },
    onClick(item) {
      this.curFuc = item
      this.getFunctionInfo(item)
      this.getTabelData()
      this.getFuncY()
      this.currentPod = item // 获得当前容器
      this.currentNode = this.dynamicFuncInfo.get(this.curFuc).nod// 当前容器所在结点
      const param = { pod_name: this.currentPod }
      clearTimeout(this.updateST)
      this.startInterval(param)
    },

    async getAllFunction() {
      this.allFunctionMap = new Map()
      this.dynamicFuncInfo = new Map()
      axios
        .get('http://10.60.150.74:5000/global/functions')
        .then(async response => {
          this.allFunctionList = response.data.func
        })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
    },
    getFunctionInfo(funcName) {
      axios
        .get('http://10.60.150.74:5000/static/function?func=' + funcName)
        .then(async response => {
          this.allFunctionMap.set(funcName, response.data)
        })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
      axios
        .get('http://10.60.150.74:5000/dynamic/function?func=' + funcName)
        .then(async response => {
          this.dynamicFuncInfo.set(funcName, response.data)
        })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
      axios
        .get('http://10.60.150.74:5000/static/pod?pod=' + funcName)
        .then(async response => {
          this.dynamicFuncInfo.get(funcName).nod = response.data.node
        })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
      axios
        .get('http://10.60.150.74:5000/dynamic/pod?pod=' + funcName)
        .then(async response => {
          this.dynamicFuncInfo.get(funcName).cpuRate = response.data.cpuRate
          this.dynamicFuncInfo.get(funcName).memRate = response.data.memRate
        })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
      getLog(funcName).then(response => {
        this.log = response.logs.replaceAll('\n', '<br>')

        this.dynamicFuncInfo.get(funcName).log = response.logs
      })
    },
    search() {
      this.showSearch = false
      console.log(this.filterText)
      for (var item in this.allFunctionList) {
        if (this.filterText == this.allFunctionList[item] || this.allFunctionList[item].match(this.filterText) != null) {
          this.showSearch = true
          this.toShow = this.allFunctionList[item]
        }
      }
    },
    handleEdit(index, row) {
      console.log(index, row)
    },
    handleDelete(index, row) {
      console.log(index, row)
    },
    // 初始化图表
    initChart() {
      this.cpuLine = echarts.init(this.$refs.cpuLine)
      this.memLine = echarts.init(this.$refs.memLine)
    },
    // 更新单个图表
    updateSingleChart(myLabel, mydata, myLine) {
      const series = []

      series.push({
        name: myLabel,
        data: mydata,
        type: 'line',
        smooth: 'true',
        areaStyle: {}
      })

      // let timeSerise = []
      // this.cpuData.forEach(data => {
      //   time = data[0]
      //   commonTime = new Date(time*1000).Format("yyyy-MM-dd hh:mm:ss")
      //   timeSerise.push(commonTime)
      // });

      const option = {
        xAxis: {
          type: 'time',
          show: false
        },
        yAxis: {
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
    // 更新两个图表
    updateChart() {
      this.updateSingleChart(this.keyArray[0], this.cpuData, this.cpuLine)
      this.updateSingleChart(this.keyArray[1], this.memData, this.memLine)
    },

    // 轮询方法
    startInterval(param) {
      getCpuMemRate(param).then(res => {
        // 数据处理
        this.cpuData = res.cpuRate.map(item => {
          return [item[0], item[1]]
        })
        this.memData = res.memRate.map(item => {
          return [item[0], item[1]]
        })
        this.updateChart()
        this.updateST = setTimeout(() => {
          clearTimeout(this.updateST)
          this.startInterval(param)
        }, 1000)
      })
    },
    // 处理更改列表的选项
    handleCurrentChange(val) {
      this.currentPod = val.pod_name // 获得当前容器
      this.currentNode = val.node// 当前容器所在结点
      const param = { pod_name: this.currentPod }
      clearTimeout(this.updateST)
      this.startInterval(param)
    },
    // 初始化列表数据
    fetchData() {
      this.listLoading = true
      getContainerList().then(response => {
        this.podList = response.pods
        this.$refs.podTable.setCurrentRow(this.podList[1])
        this.listLoading = false
      })
      getFuncList().then(response => {
        this.functionList = response.func
        for (var item in this.functionList) {
          this.getFunctionInfo(item)
        }
      }
      )
    },
    getFuncSource(funcName) {
      // 获取函数调用图信息
      getSource(funcName).then(response => {
        this.funcSource = response.source_code
        this.funcConfig = response.config
        this.mapFuncData()
        this.drawFunction()
      })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
    },

    // 调用图数据处理
    mapFuncData() {
      const that = this
      that.funcGraphData = {}
      let n_idx = 0
      const nodes = []; const links = []
      that.funcConfig.forEach((item, index) => {
        if (index === 0) {
          n_idx = n_idx + 1
          const node_1 = {
            id: n_idx,
            name: item[0],
            label: item[0],
            group: 'User 0',
            runtime: 20
          }
          nodes.push(node_1)
        }
        const inFlag = nodes.find(value => {
          return value.name === item[1]
        })

        if (inFlag === undefined) {
          n_idx = n_idx + 1

          const node_2 = {
            id: n_idx,
            name: item[1],
            label: item[1],
            group: 'User 0',
            runtime: 30
          }
          nodes.push(node_2)
        }
        let s_idx, e_idx

        nodes.find((value) => {
          if (value.name === item[0]) {
            s_idx = value.id
          }
          if (value.name === item[1]) {
            e_idx = value.id
          }
        })
        const link = {
          source: s_idx,
          target: e_idx,
          type: item[2]
        }
        links.push(link)
      })
      that.funcGraphData['nodes'] = nodes
      that.funcGraphData['links'] = links

      console.log('函数调用数据转化完成', this.funcGraphData)
    },
    // 清空整张图
    removeFuncGraph() {
      d3.select('#funcgraph')
        .selectAll('*')
        .remove() // 清空SVG中的内容
    },
    // 绘制函数调用图
    drawFunction() {
      // 保证此时数据已经拿到
      console.log('开始画图')
      console.log(this.funcGraphData.links)

      function _margin() {
        return (
          { top: 30, right: 50, bottom: 5, left: 5 }
        )
      }

      function _width(margin) {
        return (
          400 - margin.left - margin.right
        )
      }

      function _height(margin) {
        return (
          400 - margin.top - margin.bottom
        )
      }

      function ticked() {
        link.attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        node.attr('transform', d => `translate(${d.x},${d.y})`)

        edgepaths.attr('d', d => 'M' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y)
      }
      function drag(simulation) {
        function dragstarted(event, d) {
          if (!event.active) { simulation.alphaTarget(0.3).restart() }
          d.fx = d.x
          d.fy = d.y
        }

        function dragged(event, d) {
          d.fx = event.x
          d.fy = event.y
        }

        function dragended(event, d) {
          if (!event.active) { simulation.alphaTarget(0) }
          d.fx = null
          d.fy = null
        }

        return d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
        // .on("end", dragended);
      }

      const margin = _margin()
      const height = _height(margin)
      const width = _width(margin)

      // 获取div
      const svg = d3.select('#funcgraph')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('style', 'margin:0 auto')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10') // the bound of the SVG viewport for the current SVG fragment. defines a coordinate system 10 wide and 10 high starting on (0,-5)
        .attr('refX', 10) // x coordinate for the reference point of the marker. If circle is bigger, this need to be bigger.
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('xoverflow', 'visible')
        .attr('yoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#999')

      const dataset = this.funcGraphData

      // 颜色
      const colorScale = d3.scaleOrdinal() // =d3.scaleOrdinal(d3.schemeSet2)
        .domain(['Team A'])
        .range(['#ff9e6d'])

      // 初始化边
      const link = svg.selectAll('.links')
        .data(dataset.links)
        .enter()
        .append('line')
        .attr('class', 'links')
        .attr('stroke-width', 3)
        .attr('marker-end', 'url(#arrowhead)') // The marker-end attribute defines the arrowhead or polymarker that will be drawn at the final vertex of the given shape.

      // 下面这个是，会以xx方式展示
      link.append('title')
        .text(d => d.type)

      // 画边
      const edgepaths = svg.selectAll('.edgepath')
        .data(dataset.links)
        .enter()
        .append('path')
        .attr('class', 'edgepath')
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .attr('id', (d, i) => { return 'edgepath' + i })
        .style('pointer-events', 'none')

      const edgelabels = svg.selectAll('.edgelabel')
        .data(dataset.links)
        .enter()
        .append('text')
        .style('pointer-events', 'none')
        .attr('class', 'edgelabel')
        .attr('id', function(d, i) { return 'edgelabel' + i })
        .attr('font-size', 13)
        .attr('fill', '#aaa')

      // 画边的标签
      edgelabels.append('textPath') // To render text along the shape of a <path>, enclose the text in a <textPath> element that has an href attribute with a reference to the <path> element.
        .attr('xlink:href', function(d, i) { return '#edgepath' + i })
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .attr('startOffset', '50%')
        .text(d => d.type)

      //  Initialize the nodes 让结点能被拖拽
      const node = svg.selectAll('.nodes')
        .data(dataset.nodes)
        .enter()
        .append('g')
        .attr('class', 'nodes')
        .call(drag(simulation))

      node.append('circle')
        .attr('r', d => 8)
        .style('stroke-opacity', 0)
        .style('stroke-width', 1.5)
        .style('fill', d => colorScale(d.group))

      node.append('text')
        .attr('x', 8)
        .attr('y', '0.31em')
        .text(d => d.name)
        .clone(true).lower()
        .attr('fill', 'none')
        .attr('stroke-width', 10)

      // simulation
      const simulation = d3.forceSimulation()
        .force('link', d3.forceLink() // This force provides links between nodes
          .id(d => d.id) // This sets the node id accessor to the specified function. If not specified, will default to the index of a node.
          .distance(120)
        )

        .force('charge', d3.forceManyBody().strength(-700)) // This adds repulsion (if it's negative) between nodes.
        .force('center', d3.forceCenter(width / 2, height / 2))
      simulation
        .nodes(dataset.nodes)
        .on('tick', ticked)

      simulation.force('link')
        .links(dataset.links)
    }
  }

}
</script>
<style>
.el-button{
  margin-left: 15px;
}
.mixin-components-container {
  background-color: #f0f2f5;
  padding: 30px;
  min-height: calc(100vh - 84px);
}
.component-item{
  min-height: 100px;
}
.chart-wrapper {
    background: #fff;
    padding: 16px 16px 0;
    margin-bottom: 32px;
  }
@media (max-width:1024px) {
  .chart-wrapper {
    padding: 8px;
  }
}
</style>

