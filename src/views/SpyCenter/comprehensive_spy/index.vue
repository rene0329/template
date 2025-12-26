<template>
  <div class="cards-container">
    <div class="small-cards">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>访问量</span>
          </div>
        </template>
        <div class="content">
          <div class="number">8,256</div>
          <div class="chart" ref="chart"></div>
          <div class="description">日访问量 1,234</div>
        </div>
      </el-card>

      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">工作流总数量</span>
          </div>
        </template>
        <div class="content">
          <div class="number">123</div>
          <div class="notes">
            <div>运行数量</div>
            <div class="notes-number">100</div>
            <div>今日创建</div>
            <div class="notes-number">10</div>
          </div>
          <div class="description">日均创建数量 12</div>
        </div>
      </el-card>

      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">函数总数量</span>
          </div>
        </template>
        <div class="content">
          <div class="number">668</div>
          <div class="notes">
            <div>运行数量</div>
            <div class="notes-number">550</div>
            <div>今日创建</div>
            <div class="notes-number">45</div>
          </div>
          <div class="description">日均创建数量 48</div>
        </div>
      </el-card>

      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">模板总数量</span>
          </div>
        </template>
        <div class="content">
          <div class="number">76</div>
          <div class="notes">
            <div>运行数量</div>
            <div class="notes-number">30</div>
            <div>今日创建</div>
            <div class="notes-number">5</div>
          </div>
          <div class="description">日均创建数量16 </div>
        </div>
      </el-card>
    </div>
    <el-col span="24">
      <el-card class="big-card">
        <div class="card-header">
        <el-radio-group v-model="selectedOption" @change="renderBarChart">
          <el-radio-button label="workflow">工作流调度量</el-radio-button>
          <el-radio-button label="function">函数调度量</el-radio-button>
        </el-radio-group>
        <el-divider direction="vertical"></el-divider>
        <el-select v-model="selectedTimeRange" placeholder="请选择" @change="renderBarChart">
          <el-option v-for="option in timeRangeOptions" :key="option.value" :label="option.label" :value="option.value"></el-option>
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" align="right" format="yyyy-MM-dd" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" @change="renderBarChart"></el-date-picker>
      </div>
        <el-col span="16">
      <div class="barChart" ref="barChart"></div>
      </el-col>
      <el-col span="8">
        <div class="content"> 
        <div class="rank">
          <h2>工作流调用热度排名</h2>
          <ul>
            <li>
              <span class="rank-icon">1</span>
              <span class="rank-name">wf1</span>
              <span class="rank-value">233</span>
            </li>
            <li>
              <span class="rank-icon">2</span>
              <span class="rank-name">wf2</span>
              <span class="rank-value">123</span>
            </li>
            <li>
              <span class="rank-icon">3</span>
              <span class="rank-name">wf3</span>
              <span class="rank-value">23</span>
            </li>
            <!-- 添加更多排名数据 -->
          </ul>
        </div>
      </div>
      </el-col>
      </el-card>
    </el-col>
    
      
      
    


  </div>

</template>

<style>

.rank {
  width: 70%;
  margin-left: 0%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
.rank h2 {
  font-size: 16px;
  margin-bottom: 10px;
}
.rank ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.rank li {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.rank-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  line-height: 20px;
  color: #fff;
  background-color: #1890ff;
  border-radius: 50%;
}
.rank-name {
  flex: 1;
  margin-right: 10px;
  font-size: 14px;
}
.rank-value {
  font-size: 14px;
  color: #999;
}

.big-card {
  width: 96%;
  margin-top: 2%;
  margin-bottom: 2%;
}

.small-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.cards-container {
  display: block;
  justify-content: space-between;
  margin-bottom: 30px;
  margin-left: 20px;
  margin-right: 20px;
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text {
  font-size: 14px;
}

.title {
  font-size: 18px;
}

.card-title {
  font-size: 18px;
}

.notes {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  margin-top: 20px;
  margin-bottom: 50px;
}

.notes div {
  margin-right: 10px;
}

.notes-number {
  font-weight: bold;
}

.content {
  align-items: center;
  padding: 7px;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
}

.number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
}

.chart {
  width: 100%;
  height: 50px;
  margin-top: 15px;
  margin-bottom: 30px;
}

.barChart {
  width: 100%;
  height: 300px;
  margin-right: 30%;
}

.rankingList {
  width: 30%;
  padding: 10px;
  box-sizing: border-box;
}

.item {
  margin-bottom: 18px;
}

.box-card {
  width: 23%;
  margin-right: 2%;
}
</style>


<script>

import * as echarts from 'echarts';
export default {
  data() {
    return {
      dateRange: [],
      timeRangeOptions: [
        { label: '今日', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' },
        { label: '本年', value: 'year' },
      ],
      selectedTimeRange: 'today',
      selectedOption: 'workflow', // 默认选择工作流调度量
    };  
  },
  mounted() {
    this.renderChart();
    this.renderBarChart();
  },
  methods: {
    renderBarChart() {
      // 基于准备好的dom，初始化echarts实例，画柱状图
      const barChart = echarts.init(this.$refs.barChart);
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
        },
        grid: {
          left: '3%', // 修改左侧边距为 10%
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], // 添加所有月份
          axisLabel: { // 设置横轴标签样式
            margin: 10, // 与轴线之间的距离为10像素
            textStyle: {
              fontSize: 12, // 字体大小为12px
            }
          }
        },
        yAxis: {
          type: 'value',
          // 设置纵轴标签样式
          axisLabel: {
            formatter: '{value} 个', // 添加单位
            textStyle: {
              fontSize: 12, // 字体大小为12px
            }
          }
        },
        series: [
          {
            name: '数量',
            type: 'bar',
            barWidth: '60%', // 设置柱子宽度为60%
            //设置柱子颜色为深蓝色
            itemStyle: {
              normal: {
                color: '#3398DB',
                opacity: 1,
              },
            },
            data: [382, 734, 290, 1049, 1317, 630, 800, 1000, 200, 740, 600, 800], // 添加所有月份对应的数据
          },
        ],
      };

      barChart.setOption(option);
    },

    renderChart() {
      const chart = echarts.init(this.$refs.chart);
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'line',
            lineStyle: {
              color: '#ff8c00',
            },
          },
          backgroundColor: '#fff',
          textStyle: {
            color: '#000',
          },
          padding: 10,
          formatter: (params) => {
            const date = new Date(params[0].data[0]);
            const value = params[0].data[1];
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            return `${dateStr}: ${value}`;
          },
        },
        grid: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        xAxis: {
          type: 'time',
          show: false,
        },
        yAxis: {
          type: 'value',
          show: false,
        },
        series: [
          {
            type: 'line',
            symbol: 'none',
            smooth: true,
            areaStyle: {
              color: '#7948EA',
            },
            lineStyle: {
              width: 0,
            },
            data: [
              ['2023-05-01', 10],
              ['2023-05-02', 50],
              ['2023-05-03', 20],
              ['2023-05-04', 80],
              ['2023-05-05', 30],
              ['2023-05-06', 70],
              ['2023-05-07', 10],
            ],
          },
        ],
      };
      chart.setOption(option);
      chart.resize({ height: 50 });
    },
  },
};
</script>
