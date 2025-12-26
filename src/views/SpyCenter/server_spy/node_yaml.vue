<template>
  <el-tabs>
    <el-tab-pane label="Yaml文件查看">
      <div>node名称：{{ node_name }}</div>
      <el-button type="info" @click="onRefresh">刷新</el-button>
      <codemirror v-model="code" :options="codemirrorOptions" />
    </el-tab-pane>
    <el-tab-pane label="简易表格形式">
      <div>node名称：{{ node_name }}</div>
      <el-form :model="form">
        <el-form-item
          v-for="(value, key) in form.annotations"
          :key="key"
          v-model="form.annotations"
          label="annotations"
        >
          <div style="display: flex">
            <el-input :value="key">
              <template slot="append"> : </template>
            </el-input>
            <el-input :value="value" />
            <el-button @click="removeAnnotations(key)">Remove</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button @click="addAnnotation">Add Annotation</el-button>
          <div v-show="isAddAnnotation" style="display: flex">
            <el-input v-model="newAnnotationKey" placeholder="key: " />
            <el-input v-model="newAnnotationValue" placeholder="value: " />
            <el-button @click="addAnnotationCancel">Cancel</el-button>
            <el-button @click="addAnnotationConfirm">Confirm</el-button>
          </div>
        </el-form-item>
        <el-form-item
          v-for="(value, key) in form.labels"
          :key="key"
          v-model="form.labels"
          label="labels"
        >
          <div style="display: flex">
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
        <el-form-item
          v-for="taint in form.taints"
          :key="taint.key"
          v-model="form.taints"
          label="taints"
        >
          <div style="display: flex">
            <el-input :value="taint.key">
              <template slot="append"> : </template>
            </el-input>
            <el-input :value="taint.value || 'NULL'" />
            <el-input :value="taint.effect" />
            <el-button @click="removeTaints(taint.key)">Remove</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button @click="addTaint">Add Taint</el-button>
          <div v-show="isAddTaint" style="display: flex">
            <el-input v-model="newTaintKey" placeholder="key: " />
            <el-input v-model="newTaintValue" placeholder="value: " />
            <el-input v-model="newTaintEffect" placeholder="effect: " />
            <el-button @click="addTaintCancel">Cancel</el-button>
            <el-button @click="addTaintConfirm">Confirm</el-button>
          </div>
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="saveConfigurationFromForm">保存配置</el-button>
    </el-tab-pane>
  </el-tabs>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import '@/utils/codemirror_settings.js'
import { getNodeYaml, getNodeYamlForm, updateNodeYamlForm, deleteNodeYamlForm } from '@/api/ServerSpy'

export default {
  components: {
    codemirror
  },
  props: {
    node_name: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      code: `请稍微等待加载`,
      codemirrorOptions: {
        autorefresh: true, // Enable auto refresh
        mode: 'yaml', // Set the mode to YAML for syntax highlighting
        theme: 'dracula', // Set the code editor theme
        lineNumbers: true,
        lineWrapping: true
      },
      formLabelWidth: '120px',
      // 下面应该是form的数据
      form: {
        labels: {},
        annotations: {},
        taints: []
      },
      // 为添加做准备
      newAnnotationKey: '',
      newAnnotationValue: '',
      newLabelKey: '',
      newLabelValue: '',
      newTaintKey: '',
      newTaintValue: '',
      newTaintEffect: '',
      isAddAnnotation: false,
      isAddLabel: false,
      isAddTaint: false
    }
  },
  created() {
    this.fetchYaml()
  },
  methods: {
    fetchYaml() {
      const data = {
        node_name: this.node_name
      }
      getNodeYaml(data)
        .then(response => {
          this.code = response.result
        })
        .catch(error => {
          console.log(error)
          // this.$message({
          //   message: error,
          //   type: 'error'
          // })
        })
      getNodeYamlForm(data)
        .then(response => {
          console.log(response)
          this.form.labels = response.result.labels
          this.form.annotations = response.result.annotations
          // 如果不存在taints，就设置为空数组
          if ('taints' in response.result === false) {
            this.form.taints = []
          } else {
            this.form.taints = response.result.taints
          }
          console.log(this.form)
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
      const data = {
        node_name: this.node_name,
        annotations: this.form.annotations,
        labels: this.form.labels,
        taints: this.form.taints
      }
      console.log(data)
      updateNodeYamlForm(data)
        .then(response => {
          console.log(response)
          this.$message({
            message: '保存成功',
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
    addAnnotation() {
      this.isAddAnnotation = true
    },
    removeAnnotations(key) {
      const temp = {}
      temp[key] = null
      const data = {
        node_name: this.node_name,
        annotations: temp,
        labels: {}
      }
      deleteNodeYamlForm(data)
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
      delete this.form.annotations[key]
      this.form.annotations = { ...this.form.annotations }
    },
    addAnnotationCancel() {
      this.isAddAnnotation = false
      this.newAnnotationKey = ''
      this.newAnnotationValue = ''
    },
    addAnnotationConfirm() {
      this.form.annotations[this.newAnnotationKey] = this.newAnnotationValue
      this.form.annotations = { ...this.form.annotations }
      this.isAddAnnotation = false
    },
    addLabel() {
      this.isAddLabel = true
    },
    removeLabels(key) {
      const temp = {}
      temp[key] = null
      const data = {
        node_name: this.node_name,
        annotations: {},
        labels: temp
      }
      deleteNodeYamlForm(data)
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
      delete this.form.labels[key]
      this.form.labels = { ...this.form.labels }
    },
    addLabelCancel() {
      this.isAddLabel = false
      this.newLabelKey = ''
      this.newLabelValue = ''
    },
    addLabelConfirm() {
      this.form.labels[this.newLabelKey] = this.newLabelValue
      this.form.labels = { ...this.form.labels }
      this.isAddLabel = false
    },
    addTaint() {
      this.isAddTaint = true
    },
    removeTaints(key) {
      this.form.taints = this.form.taints.filter(item => item.key !== key)
    },
    addTaintCancel() {
      this.isAddTaint = false
      this.newTaintKey = ''
      this.newTaintValue = ''
      this.newTaintEffect = ''
    },
    addTaintConfirm() {
      this.form.taints.push({
        key: this.newTaintKey,
        value: this.newTaintValue,
        effect: this.newTaintEffect
      })
      this.isAddTaint = false
    },
    onRefresh() {
      this.fetchYaml()
    }
  }
}

</script>

<style>

</style>
