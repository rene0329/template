<template>
  <el-tabs>
    <el-tab-pane label="日志信息">
      <div>{{ pod_name }}</div>
      <codemirror v-model="pod_logs" :options="cmOptions" />
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import '@/utils/codemirror_settings.js'
import { getPodLogs } from '@/api/ContainerSpy'

export default {
  components: {
    codemirror
  },
  props: {
    pod_name: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      pod_logs: '123123dad',
      cmOptions: {
        autorefresh: true, // Enable auto refresh
        mode: 'text', // Set the mode to YAML for syntax highlighting
        theme: 'monokai', // Set the code editor theme
        lineNumbers: true, // Show line numbers
        lineWrapping: true // Enable line wrapping
      }
    }
  },
  created() {
    this.fetchLogs()
  },
  methods: {
    fetchLogs() {
      const post_data = {
        pod_name: this.pod_name
      }
      getPodLogs(post_data)
        .then(response => {
          console.log(response)
          this.pod_logs = response.result
        })
        .catch(error => {
          console.log(error)
        })
    }
  }
}

</script>

<style scoped>

</style>
