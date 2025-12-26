<template>
  <el-tabs>
    <el-tab-pane label="Yaml(stack.yml)文件修改">
      <div>函数名称：{{ workflow_name }}</div>
      <el-button type="primary" size="small" @click="onRefreshStack">刷新</el-button>
      <codemirror v-model="workflow_yaml_stack" :options="cmOptions" />
      <el-button type="primary" @click="saveConfigurationFromCodeStack">保存配置</el-button>
    </el-tab-pane>
    <el-tab-pane label="Yaml(Env/flow.yml)文件修改">
      <div>函数名称：{{ workflow_name }}</div>
      <el-button type="primary" size="small" @click="onRefreshEnv">刷新</el-button>
      <codemirror v-model="workflow_yaml_env" :options="cmOptions" />
      <el-button type="primary" @click="saveConfigurationFromCodeEnv">保存配置</el-button>
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import '@/utils/codemirror_settings.js'
import { getWorkFlowYamlStack, updateWorkFlowYamlStack, getWorkFlowYamlEnv, updateWorkFlowYamlEnv } from '@/api/WorkFlowSpy'

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
      workflow_yaml_stack: 'this is stack.yml',
      workflow_yaml_env: 'this is env/flow.yml',
      cmOptions: {
        autorefresh: true, // Enable auto refresh
        mode: 'yaml', // Set the mode to YAML for syntax highlighting
        theme: 'dracula', // Set the code editor theme
        lineNumbers: true, // Show line numbers
        lineWrapping: true // Enable line wrapping
      }
    }
  },
  mounted() {
    this.fetchYamlStack()
    this.fetchYamlEnv()
  },
  methods: {
    fetchYamlStack() {
      const post_data = {
        workflow_name: this.workflow_name
      }
      getWorkFlowYamlStack(post_data)
        .then(response => {
          console.log(response)
          this.workflow_yaml_stack = response.result
        })
        .catch(error => {
          console.log(error)
        })
    },
    fetchYamlEnv() {
      const post_data = {
        workflow_name: this.workflow_name
      }
      getWorkFlowYamlEnv(post_data)
        .then(response => {
          console.log(response)
          this.workflow_yaml_env = response.result
        })
        .catch(error => {
          console.log(error)
        })
    },
    saveConfigurationFromCodeStack() {
      const post_data = {
        workflow_name: this.workflow_name,
        new_workflow_yaml_stack: this.workflow_yaml_stack
      }
      updateWorkFlowYamlStack(post_data)
        .then(response => {
          console.log(response)
          this.$message({
            message: '保存成功',
            type: 'success'
          })
        })
        .catch(error => {
          console.log(error)
        })
    },
    saveConfigurationFromCodeEnv() {
      const post_data = {
        workflow_name: this.workflow_name,
        new_workflow_yaml_env: this.workflow_yaml_env
      }
      updateWorkFlowYamlEnv(post_data)
        .then(response => {
          console.log(response)
          this.$message({
            message: '保存成功',
            type: 'success'
          })
        })
        .catch(error => {
          console.log(error)
        })
    },
    onRefreshStack() {
      this.fetchYamlStack()
      this.$message({
        message: '刷新成功',
        type: 'success'
      })
    },
    onRefreshEnv() {
      this.fetchYamlEnv()
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
