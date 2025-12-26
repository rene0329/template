<!-- data_detail_info.vue -->
<template>
  <div>
    <el-table
      :data="tableData"
      style="width: 100%"
    >
      <el-table-column prop="data_name" label="数据名称" width="200" align="center" />
      <el-table-column prop="data_location" label="数据位置" width="180" align="center" />


      <el-table-column
        prop="data_heat"
        label="温度"
        width="80"
      >
        <template slot-scope="scope">
          <!-- 根据温度值来设置背景色 -->
          <div :style="{ backgroundColor: getdata_heatColor(scope.row.data_heat), width: '25px', height: '25px' }" />
        </template>
      </el-table-column>
      <el-table-column
        prop="data_layer"
        label="存储层次"
        width="80"
      >
      <template slot-scope="scope">
        <!-- 根据 data_heat 的值来设置 data_layer -->
        <div>{{ getStorageLayer(scope.row.data_heat) }}</div>
      </template>
       </el-table-column>
    </el-table>
  </div>
</template>

<script>

import { getDuplicateDataMonitorData } from '@/api/DataMonitor'

export default {
  props: {
    singleData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      tableData: []
    }
  },
  created() {
    // this.tableData = this.singleData
    this.fetchData()
  },
  methods: {
    fetchData() {
      const data_name = this.singleData[0].data_name
      console.log(data_name)
      const post_data = {
        data: data_name
      }
      getDuplicateDataMonitorData(post_data).then(response => {
        this.tableData = response.data
      })
    },
    // 根据温度值来设置背景色
    getdata_heatColor(temp) {
      if (temp === '冷') {
        return 'blue'
      } else if (temp === '温') {
        return 'orange'
      } else if (temp === '热') {
        return 'red'
      } else {
        return 'transparent' // 如果没有匹配的温度值，设置为透明
      }
    },
    getStorageLayer(heat) {
      switch (heat) {
        case '冷':
          return '外部存储';
        case '温':
          return '磁盘';
        case '热':
          return '内存';
        default:
          return '未知';
      }
    },
  }
}

</script>

<style scoped>

</style>
