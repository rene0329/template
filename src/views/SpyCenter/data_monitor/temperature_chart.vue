<template>
  <div>
    <div ref="echarts" style="width: 100%; height: 400px"></div>
  </div>
</template>

<script>
import { getDataPosition } from "@/api/DataMonitor";
import echarts from "echarts";

export default {
  mounted() {
    this.initChart();
  },
  methods: {
    initChart() {
      getDataPosition().then((res) => {
        const positionData = res.data;
        // 基于准备好的dom，初始化echarts实例
        let myChart = echarts.init(this.$refs.echarts);
        console.log(positionData);
        this.position = [];
        this.data_name = [];
        this.data = [];
        for (let i = 0; i < positionData.length; i++) {
          this.position.push(positionData[i].location);
          if (positionData[i].data_num == 0) continue;
          for (let j = 0; j < positionData[i].data_num; j++) {
            const data_name = positionData[i].data_list[j];
            // 先看看有没有出现在data_name中
            if (this.data_name.indexOf(data_name) == -1) {
              this.data_name.push(data_name);
            }
            // 寻找data_name的位置
            const data_name_index = this.data_name.indexOf(data_name);
            const heat = positionData[i].data_heat_list[j];
            // 推入热力数据
            this.data.push([data_name_index, i, heat + 1]);
            // console.log(data_name_index, i, heat);
            // console.log(positionData[i].data_list[j])
            // console.log(positionData[i].data_heat_list[j])
          }
        }
        // 指定图表的配置项和数据
        let option = {
          title: {
            text: "数据温度图",
            left: "center",
          },
          tooltip: {
            position: "top",
          },
          animation: false,
          grid: {
            height: "50%",
            top: "10%",
          },
          xAxis: {
            type: "category",
            data: this.data_name,
            splitArea: {
              show: true,
            },
          },
          yAxis: {
            type: "category",
            data: this.position,
            splitArea: {
              show: true,
            },
          },
          visualMap: {
            type: "piecewise",
            categories: ["冷", "温", "热"],
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: "15%",
            textStyle: {
              color: "#fff", // 文字颜色
            },
            inRange: {
              color: ["#409eff", "#f9d770", "#d53a35"], // 修改热力图的颜色 淡蓝色=>深蓝色的过度
            },
            pieces: [
              { value: "1", label: "冷" },
              { value: "2", label: "温" },
              { value: "3", label: "热" },
            ],
          },
          series: [
            {
              name: "Punch Card",
              type: "heatmap",
              data: this.data,
              label: {
                show: true,
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowColor: "rgba(0, 0, 0, 0.5)",
                },
              },
            },
          ],
        };

        // 使用刚指定的配置项和数据显示图表
        myChart.setOption(option);
      });
    },
  },
  data() {
    return {
      data_name: [
        "data1",
        "data2",
        "data3",
        "data4",
        "data5",
      ],
      position: ["Master", "Node1", "Node2", "Node3", "Node4", "Node5"],
      data: [
        [0, 0, 1],
        [0, 1, 1],
        [0, 2, 2],
        [0, 3, 3],
        [0, 5, 2],
      ],
    };
  },
};
</script>

<style scoped>
/* 可以添加样式 */
</style>
