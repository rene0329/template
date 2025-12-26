<template>
  <div>
    <div ref="chart" style="width: 400px; height: 300px"></div>
  </div>
</template>

<script>
import { getDataPosition } from "@/api/DataMonitor";
import * as echarts from "echarts";

export default {
  mounted() {
    this.initChart();
  },
  methods: {
    initChart() {
      getDataPosition().then((res) => {
        const positionData = res.data;
        for (let i = 0; i < positionData.length; i++) {
          positionData[i].value = positionData[i].data_num;
          positionData[i].name = positionData[i].location;
        }
        const location = positionData.map((item) => item.location);
        const chart = echarts.init(this.$refs.chart);
        const option = {
          title: {
            text: "数据位置图",
            left: "center",
          },
          tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b} : {c} ({d}%)",
          },
          legend: {
            orient: "vertical",
            left: -5,
            data: location,
          },
          series: [
            {
              name: "Node Data",
              type: "pie",
              radius: "55%",
              center: ["50%", "60%"],
              data: positionData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: "rgba(0, 0, 0, 0.5)",
                },
              },
            },
          ],
        };
        chart.setOption(option);
      });
    },
  },
};
</script>

<style scoped>
/* 可以添加样式 */
</style>
