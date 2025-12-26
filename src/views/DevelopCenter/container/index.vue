<template>
  <div>
    <h1>FaaS/PaaS 容器状态列表</h1>
    <el-table :data="containers" style="width: 100%">
      <el-table-column prop="name" label="Name"></el-table-column>
      <el-table-column prop="status" label="Status"></el-table-column>
      <el-table-column label="Action">
        <template slot-scope="scope">
          <el-button @click="toggleStatus(scope.row)" type="primary" size="mini">Toggle</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { ElTable, ElTableColumn, ElButton } from 'element-ui';

export default {
  components: {
    ElTable,
    ElTableColumn,
    ElButton
  },
  data() {
    return {
      containers: [
        { id: 1, name: 'Container A', status: 'Created' },
        { id: 2, name: 'Container B', status: 'Running' },
        { id: 3, name: 'Container C', status: 'Failed' },
      ]
    }
  },
  methods: {
    toggleStatus(container) {
      // 在这里添加切换状态的代码
      // 例如：container.status = (container.status === 'Running') ? 'Stopped' : 'Running';
    }
  }
}
</script>

<style>
/* 可以添加自定义的样式 */
</style>
