<template>
  <div :class="className" :style="{height:height,width:width}" />
</template>

<script>
import echarts from 'echarts'
require('echarts/theme/macarons') // echarts theme
import resize from './mixins/resize'
import axios from 'axios'
export default {
   
   created() {
   
   },
  mixins: [resize],
  props: {
    className: {
      type: String,
      default: 'chart'
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '350px'
    },
    autoResize: {
      type: Boolean,
      default: true
    },
    chartData: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      chart: null,
      cpuRate:[],
      memRate:[],
      X:[]
    }
  },
  watch: {
    chartData: {
      deep: true,
      handler(val) {
        this.setOptions(val)
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initChart()
    })
  },
  beforeDestroy() {
    if (!this.chart) {
      return
    }
    this.chart.dispose()
    this.chart = null
  },
  methods: {
   initChart() {
      this.chart = echarts.init(this.$el, 'macarons')
      this.getPodRate()
      
      
    },
    
    async getPodRate(){
      this.chart.showLoading();
      axios
         .get('http://10.60.150.24:8000/dynamic/pod?pod=add')
         .then(async res => {
           setTimeout(async () => {     
             var r1 = await res.data.cpuRate
             var r2 = await res.data.memRate
            //  console.log(this.cpuRate)
            //  console.log(this.memRate)
            console.log("length")
             var t = []
            var i =0
            for(let item of r1){
              	// t[i] = item[0]
                this.X[i] = item[0]
                this.cpuRate[i] = item[1]
                i++
            }
            i=0
             for(let item of r2){
                this.memRate[i] = item[1]
                i++
            }
                console.log(this.cpuRate)
             console.log(this.memRate)
            // console.log(t)
            console.log("lengthover")

              // this.X =  t
             this.chart.hideLoading();
             this.setOptions()
             
           }, 500); //加载动画时长为0.5秒
         })
         .catch(err => {
                 });

  
    },
    getX(){
      return this.X

    },
    setOptions() {
      this.chart.setOption({
        xAxis: {
          type: "category",
          data: this.X,
          // data: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60],
          boundaryGap: false,
          axisTick: {
            show: false
          }
        },
        grid: {
          left: 10,
          right: 10,
          bottom: 20,
          top: 30,
          containLabel: true
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          padding: [5, 10]
        },
        yAxis: {
          type: 'value',
          axisTick: {
            show: false
          }
        },
        legend: {
          data: ['this.memRate', 'this.cpuRate']
        },
        series: [{
          name: 'expected', itemStyle: {
            normal: {
              color: '#FF005A',
              lineStyle: {
                color: '#FF005A',
                width: 2
              }
            }
          },
          smooth: true,
          type: 'line',
          data: this.cpuRate,
          // data:[0.017092104697576903,0.03213057011643218,0.03213057011643218,0.03213057011643218,0.03213057011643218,0.03213057011643218,0.03213057011643218,0.029189822784258045,0.029189822784258045,0.029189822784258045,0.029189822784258045,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.014151357365402762,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.03542929810606996,0.019286326239274107,0.019286326239274107,0.019286326239274107,0.019286326239274107,0.013969892312287763,0.013969892312287763,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0.029516053729795433,0,0.01772971539364871,0.01772971539364871,0.0360702673734506,0.0360702673734506,0.0360702673734506,0.0360702673734506,0.0360702673734506,0.0360702673734506,0.0360702673734506],
          // data: [2,4,5,6,5,6,7,8],
          animationDuration: 2800,
          animationEasing: 'cubicInOut'
        },
        {
          name: 'actual',
          smooth: true,
          type: 'line',
          itemStyle: {
            normal: {
              color: '#3888fa',
              lineStyle: {
                color: '#3888fa',
                width: 2
              },
              areaStyle: {
                color: '#f3f8ff'
              }
            }
          },
          data: this.memRate,
          // data: [0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667,0.830822350866667],
          animationDuration: 2800,
          animationEasing: 'quadraticOut'
        }]
      })
    }
  }
}
</script>
