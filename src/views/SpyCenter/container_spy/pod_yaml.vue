<template>
  <el-tabs>
    <el-tab-pane label="Yaml文件查看">
      <div>pod名称：{{ pod_name }}</div>
      <el-button type="info" @click="onRefresh">刷新</el-button>
      <codemirror v-model="code" :options="codemirrorOptions" />
    </el-tab-pane>
    <el-tab-pane label="简易表格形式">
      <div>pod名称：{{ pod_name }}</div>
      <el-form>
        <el-form-item
          v-for="(value, key) in form.pod_labels"
          :key="key"
          v-model="form.pod_labels"
          label="labels"
        >
          <div style="display: flex;">
            <el-input :value="key">
              <template slot="append"> : </template>
            </el-input>
            <el-input :value="value" />
            <el-button @click="removeLabels(key)">Remove</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button @click="addLabel">Add Label</el-button>
          <div v-show="isAddLabel" style="display: flex">
            <el-input v-model="newLabelKey" placeholder="key: " />
            <el-input v-model="newLabelValue" placeholder="value: " />
            <el-button @click="addLabelCancel">Cancel</el-button>
            <el-button @click="addLabelConfirm">Confirm</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <div>镜像名称 : {{ form.pod_container_name }}</div>
        </el-form-item>
        <el-form-item label="pod镜像url" :label-width="formLabelWidth">
          <el-input v-model="form.pod_image" auto-complete="off" />
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="saveConfigurationFromForm">保存配置</el-button>
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import '@/utils/codemirror_settings.js'
import { getPodYaml, getPodYamlForm, updatePodYamlForm, deletePodYamlForm } from '@/api/ContainerSpy'

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
      code: `请稍微等待加载`,
      // YAML configuration data for code editor
      codemirrorOptions: {
        autorefresh: true, // Enable auto refresh
        mode: 'yaml', // Set the mode to YAML for syntax highlighting
        theme: 'dracula', // Set the code editor theme
        lineNumbers: true,
        lineWrapping: true
      },
      form: {
        pod_labels: {},
        pod_image: '',
        pod_container_name: ''
      },
      formLabelWidth: '120px',
      // 表格控制/数据
      isAddLabel: false,
      newLabelKey: '',
      newLabelValue: ''
    }
  },
  created() {
    this.fetchYaml()
  },
  methods: {
    fetchYaml() {
      const data = {
        pod_name: this.pod_name
      }
      getPodYaml(data)
        .then(response => {
          console.log(response)
          this.code = response.result
        })
        .catch(error => {
          console.log(error)
          // this.$message({
          //   message: error,
          //   type: 'error'
          // })
        })
      getPodYamlForm(data)
        .then(response => {
          console.log(response)
          this.form.pod_labels = response.result.pod_labels
          this.form.pod_image = response.result.pod_image
          this.form.pod_container_name = response.result.pod_container_name
          this.form.pod_namespace = response.result.pod_namespace
        })
        .catch(error => {
          console.log(error)
          // this.$message({
          //   message: error,
          //   type: 'error'
          // })
        })
    },
    saveConfigurationFromForm() {
      const post_data = {
        pod_name: this.pod_name,
        pod_labels: this.form.pod_labels,
        pod_image: this.form.pod_image,
        pod_container_name: this.form.pod_container_name
      }
      updatePodYamlForm(post_data)
        .then(response => {
          console.log(response)
          this.$message({
            message: response.result,
            type: 'success'
          })
        })
        .catch(error => {
          console.log(error)
          // this.$message({
          //   message: error,
          //   type: 'error'
          // })
        })
    },
    // Label
    addLabel() {
      this.isAddLabel = true
    },
    removeLabels(key) {
      const temp = {}
      temp[key] = null
      const data = {
        pod_name: this.pod_name,
        labels: temp
      }
      deletePodYamlForm(data)
        .then(response => {
          console.log(response)
          this.$message({
            message: '删除成功',
            type: 'success'
          })
        })
        .catch(error => {
          console.log(error)
          // this.$message({
          //   message: error,
          //   type: 'error'
          // })
        })
      delete this.form.pod_labels[key]
      this.form.pod_labels = { ...this.form.pod_labels }
    },
    addLabelCancel() {
      this.isAddLabel = false
      this.newLabelKey = ''
      this.newLabelValue = ''
    },
    addLabelConfirm() {
      this.form.pod_labels[this.newLabelKey] = this.newLabelValue
      this.form.pod_labels = { ...this.form.pod_labels }
      this.isAddLabel = false
    },
    onRefresh() {
      this.fetchYaml()
    }
  }

}

</script>

<style scoped>

</style>
