<!--容器模块-->
<template>
  <el-row class="container" :gutter="20" style="padding-top:20px; margin:0 auto">
    <el-col :span="6" style="margin-top:10px; height:780px; overflow-x:auto;">
      <el-card style="height:100%">
        <el-table
          ref="podTable"
          :data="podList"
          highlight-current-row
          style="width: 100%; overflow:visible; "
          @current-change="handleCurrentChange"
        >
          <el-table-column
            property="name"
            label="当前容器列表"
          >
            <template slot-scope="scope">
              {{ scope.row.pod_real_name }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

    </el-col>

    <el-col :span="18">
      <el-card>
        <el-descriptions class="server" direction="vertical" border>
          <el-descriptions-item label="所在服务器">
            {{ "所在服务器："+currentNode }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-col :span="12" style="margin-top:10px;">
        <el-card style="height:200px;">
          <div ref="cpuLine" style="height:200px;" />
          <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
        </el-card>
        <el-card style="height:500px; margin-top:10px;">

          <div id="funcgraph" style="max-height:430px;overflow: scroll;" />

        </el-card>
      </el-col>
      <el-col :span="12" style="margin-top:10px;">
        <el-card style="height:200px;">
          <div ref="memLine" style="height:200px" />
          <div style="margin-top:-55px;margin-right:-10px;font-size: 13px;">  0 - 60</div>
        </el-card>
        <el-card style="height:500px; margin-top:10px; padding-bottom:20px">

          <pre v-highlightjs="funcSource" style="max-height:430px;overflow: scroll;"><code class="python" /></pre>
        </el-card>
      </el-col>
    </el-col>

    <!-- <el-col :span="8">

    </el-col> -->
  </el-row>
</template>

<script>
import axios from 'axios'
import { getContainerList, getCpuMemRate } from '@/api/container'
import { getSource, getStatFunc } from '@/api/func'
import * as d3 from 'd3'
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
  for (var k in o) { if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length))) }
  return fmt
}

export default {
  data() {
    return {
      podList: [],
      currentPod: null,
      currentNode: null,
      cpuData: null,
      memData: null,
      cpuLine: null,
      memLine: null,
      keyArray: ['cpu占用率', '内存占用率'],
      updateST: null, // 轮询计时对象
      funcConfig: null,
      funcSource: null,
      funcGraphData: {},
      funcUpdateST: null, // 函数调用图计时对象 TODO 是否可以和速率图共用
      funcRunningAPI: null,
      funcRunningInfo: null,
      funcStatus: {
        'running': 1,
        'stop': 0
      }
    }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    this.initChart()
  },
  destroyed() {
    clearTimeout(this.updateST)
    clearTimeout(this.funcUpdateST)
  },
  methods: {

    // 初始化图表
    initChart() {
      this.cpuLine = echarts.init(this.$refs.cpuLine)
      this.memLine = echarts.init(this.$refs.memLine)
    },
    // 更新单个图表
    updateSingleChart(myLabel, mydata, myLine) {
      const series = []
      const xArr = Array(60)
      for (var i = 0; i < xArr.length; i++) {
        xArr[i] = i + 1
      }

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
          // type:'time',
          data: xArr,
          //   axisLabel: {
          //       min:0,
          //       max:60,
          //       interval:1,
          //       // show: false, // 不显示坐标轴上的文字
          // },
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
        this.cpuData = res.cpuRate

        // let tempArr = []
        // res.cpuRate.forEach(item => {
        //   tempArr.push(item[1])
        // })
        // this.cpuData = tempArr

        this.memData = res.memRate

        this.updateChart()
        this.updateST = setTimeout(() => {
          clearTimeout(this.updateST)
          this.startInterval(param)
        }, 1000)
      }).catch(function(error) { // 请求失败处理
        console.log(error)
      })
    },
    // 处理更改列表的选项
    handleCurrentChange(val) {
      this.currentPod = val.pod_name // 获得当前容器
      this.currentNode = val.node// 当前容器所在结点
      const param = { pod_name: this.currentPod }

      clearTimeout(this.updateST)
      this.startInterval(param)

      const funcName = this.currentPod
      this.getFuncSource(funcName)
    },
    // 初始化列表数据
    fetchData() {
      this.listLoading = true
      getContainerList().then(response => {
        this.podList = response.pods
        this.$refs.podTable.setCurrentRow(this.podList[0])
        this.currentPod = this.podList[0]
        this.getFuncSource(this.currentPod.pod_name)
        this.listLoading = false
      })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
    },

    // 函数调用图的轮询方法
    startFuncInterval(funcName) {
      // 轮询之前需要先获取到静态信息
      // 获取实时状态图【变化，需要轮询】
      axios
        .get('http://' + this.funcRunningAPI + ':5000/running?func=' + funcName)
        .then(response => {
          this.funcRunningInfo = response.data
          console.log('当前调用状态', this.funcRunningInfo)

          this.removeFuncGraph()

          // 更新this.funcGraphData
          this.updateGraphData()

          // 更新图
          this.drawFunction(funcName)

          this.funcUpdateST = setTimeout(() => {
            clearTimeout(this.funcUpdateST)
            this.startFuncInterval(funcName)
          }, 3000)
        })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
    },

    getFuncSource(funcName) {
      // 获取源代码和调用图配置【不变】
      getSource(funcName).then(response => {
        this.funcSource = response.source_code
        this.funcConfig = response.config

        this.mapFuncData()
      })
        .catch(function(error) { // 请求失败处理
          console.log(error)
        })
      // 获取函数静态信息，得到running_api【不变】
      getStatFunc(funcName).then(response => {
        this.funcRunningAPI = response.running_api
        clearTimeout(this.funcUpdateST)
        this.startFuncInterval(funcName)
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
        const inFlag_1 = nodes.find(value => {
          return value.name === item[0]
        })
        if (index === 0 || inFlag_1 === undefined) {
          n_idx = n_idx + 1
          const node_1 = {
            id: n_idx,
            name: item[0],
            label: item[0],
            group: 0,
            runtime: 20
          }
          nodes.push(node_1)
        }
        const inFlag_2 = nodes.find(value => {
          return value.name === item[1]
        })

        if (inFlag_2 === undefined) {
          n_idx = n_idx + 1

          const node_2 = {
            id: n_idx,
            name: item[1],
            label: item[1],
            group: 0,
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

      // console.log("函数调用数据转化完成",this.funcGraphData)
    },
    // 更新funcGraphData的信息
    updateGraphData() {
      let status = this.funcRunningInfo['running_status']
      status = this.funcStatus[status]
      let changeFlag = false
      console.log('graph_data_updating', status)
      this.funcRunningInfo['running_info'].forEach(item => {
        this.funcGraphData['nodes'].find((value, idx) => {
          if (value.name === item) {
            this.funcGraphData['nodes'][idx].group = status
            changeFlag = true
          }
          if (!changeFlag) {
            this.funcGraphData['nodes'][idx].group = 1 - status
            changeFlag = false
          }
        })
      })
      console.log(this.funcGraphData.nodes)
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
      // console.log("开始画图")
      // console.log(this.funcGraphData.links)

      function _margin() {
        return (
          { top: 30, right: 50, bottom: 5, left: 5 }
        )
      }

      function _width(margin) {
        return (
          500 - margin.left - margin.right
        )
      }

      function _height(margin) {
        return (
          500 - margin.top - margin.bottom
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
          if (!event.active) simulation.alphaTarget(0.5).restart()
          d.fx = d.x
          d.fy = d.y
        }

        function dragged(event, d) {
          d.fx = event.x
          d.fy = event.y
        }

        function dragended(event, d) {
          if (!event.active) simulation.alphaTarget(0)
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
        .attr('id', 'funcgraph_svg')

        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10') // the bound of the SVG viewport for the current SVG fragment. defines a coordinate system 10 wide and 10 high starting on (0,-5)
        .attr('refX', 10) // x coordinate for the reference point of the marker. If circle is bigger, this need to be bigger.
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 10)
        .attr('xoverflow', 'visible')
        .attr('yoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#999')

      const dataset = this.funcGraphData

      // 不同的运行状态颜色
      const colorScale = d3.scaleOrdinal() // =d3.scaleOrdinal(d3.schemeSet2)
        .domain([1, 0])
        .range(['#00B050', '#FF0000'])

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

      // TODO 根据边的类型不同改变边的弧度

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
        .attr('font-size', 7)
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
        .attr('r', d => 6)
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
          .distance(60)
        )

        .force('charge', d3.forceManyBody().strength(-20)) // This adds repulsion (if it's negative) between nodes.
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(65).iterations(2))
      simulation
        .nodes(dataset.nodes)
        .on('tick', ticked)

      simulation.force('link')
        .links(dataset.links)

      //   //drawing the legend
      // const legend_g = svg.selectAll(".legend")
      // .data(["running","stop"])
      // .enter().append("g")
      // .attr("transform", (d, i) => `translate(${width-100},${i*20})`);

      // legend_g.append("circle")
      //   .attr("cx", -20)
      //   .attr("cy", 0)
      //   .attr("r", 5)
      //   .attr("fill", colorScale);

      // legend_g.append("text")
      //   .attr("x", 10)
      //   .attr("y", 5)
      //   .text(d => d);
    }
  }
}
</script>
<style>

.links {
stroke: #999;
stroke-opacity: 0.6;
stroke-width: 2px;
}

text {
pointer-events: none;
fill: #000;
font: 11px sans-serif;
}
.title{
      -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    font-family: Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif;
    font-size: 20px;
    border-collapse: separate;
    color: #909399;
    text-align: left;
    user-select: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-all;
    line-height: 23px;
    display: inline-block;
    box-sizing: border-box;
    position: relative;
    vertical-align: middle;
    padding-left: 10px;
    padding-right: 10px;
    width: 100%;
}
</style>
