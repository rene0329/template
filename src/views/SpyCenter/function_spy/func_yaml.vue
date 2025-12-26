<template>
  <el-tabs>
    <el-tab-pane label="Yaml文件修改">
      <div>函数名称：{{ func_name }}</div>
      <el-button type="primary" size="small" @click="onRefresh">刷新</el-button>
      <codemirror v-model="func_yaml" :options="cmOptions" />
      <el-button type="primary" @click="saveConfigurationFromCode">保存配置</el-button>
    </el-tab-pane>
    <el-tab-pane label="简易表格形式">
      <el-form>
        <el-form-item label="函数名称" :label-width="formLabelWidth">
          <el-input v-model="func_name" auto-complete="off" />
        </el-form-item>
        <el-form-item label="函数镜像" :label-width="formLabelWidth">
          <el-input v-model="form.image" auto-complete="off" />
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="saveConfigurationFromForm">保存配置</el-button>
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import '@/utils/codemirror_settings.js'
import { getFuncYaml, getFuncYamlForm, updateFuncYaml, updateFuncYamlForm } from '@/api/FuncSpy'

export default {
  components: {
    codemirror
  },
  props: {
    func_id: {
      type: String,
      default: ''
    },
    func_name: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      configTab: '配置信息',
      func_yaml: `请稍微等待加载,长时间请点击刷新`, // YAML configuration data for code editor
      cmOptions: {
        autorefresh: true, // Enable auto refresh
        mode: 'yaml', // Set the mode to YAML for syntax highlighting
        theme: 'dracula', // Set the code editor theme
        lineNumbers: true, // Show line numbers
        lineWrapping: true // Enable line wrapping
      },
      formLabelWidth: '120px',
      form: {
        image: ''
      }
    }
  },
  mounted() {
    this.fetchYaml()
  },
  methods: {
    fetchYaml() {
      const post_data = {
        func_name: this.func_name
      }
      getFuncYaml(post_data)
        .then(response => {
          console.log(response)
          this.func_yaml = response.result
        })
        .catch(error => {
          console.log(error)
        })
      getFuncYamlForm(post_data)
        .then(response => {
          console.log(response)
          this.form.image = response.result.image
        })
        .catch(error => {
          console.log(error)
        })
    },
    saveConfigurationFromCode() {
      const post_data = {
        func_name: this.func_name,
        new_func_yaml: this.func_yaml
      }
      console.log(post_data)
      updateFuncYaml(post_data)
        .then(response => {
          console.log(response)
          this.$message({
            message: response.result,
            type: 'info'
          })
        })
        .catch(error => {
          console.log(error)
        })
      // 关闭弹窗
      this.$emit('close')
    },
    saveConfigurationFromForm() {
      const post_data = {
        func_name: this.func_name,
        image: this.form.image
      }
      console.log(post_data)
      updateFuncYamlForm(post_data)
        .then(response => {
          console.log(response)
          this.$message({
            message: response.result,
            type: 'success'
          })
        })
        .catch(error => {
          console.log(error)
        })
      // 关闭弹窗
      this.$emit('close')
    },
    onRefresh() {
      this.fetchYaml()
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

