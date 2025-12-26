<template>
  <el-tabs>
    <el-tab-pane label="日志信息">
      <div>函数名称: {{ workflow_name }}</div>
      <el-button type="primary" size="small" @click="onRefresh">刷新</el-button>
      <codemirror v-model="workflow_logs" :options="cmOptions" />
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import '@/utils/codemirror_settings.js'
import { getWorkFlowLogs } from '@/api/WorkFlowSpy'

export default {
  components: {
    codemirror
  },
  props: {
    workflow_name: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      workflow_logs: '123123dad',
      cmOptions: {
        autorefresh: true, // Enable auto refresh
        mode: 'text', // Set the mode to YAML for syntax highlighting
        theme: 'dracula', // Set the code editor theme
        lineNumbers: true, // Show line numbers
        lineWrapping: true // Enable line wrapping
      }
    }
  },
  mounted() {
    this.fetchLogs()
  },
  methods: {
    fetchLogs() {
      const post_data = {
        workflow_name: this.workflow_name
      }
      getWorkFlowLogs(post_data)
        .then(response => {
          console.log(response)
          this.workflow_logs = response.result
        })
        .catch(error => {
          console.log(error)
        })
    },
    onRefresh() {
      this.fetchLogs()
      this.$message({
        message: '刷新成功',
        type: 'success'
      })
    }
  }
}
</script>

<style scoped>

</style>
