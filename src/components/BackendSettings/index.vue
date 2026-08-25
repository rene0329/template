<template>
  <el-dialog
    title="服务器连接设置"
    :visible.sync="visible"
    width="520px"
    append-to-body
    :close-on-click-modal="false"
    @opened="loadConfig"
  >
    <el-form ref="configForm" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="后端地址" prop="backendUrl">
        <el-input v-model.trim="form.backendUrl" placeholder="例如：http://10.212.14.88:31081" />
      </el-form-item>
      <el-form-item label="健康检查" prop="healthPath">
        <el-input v-model.trim="form.healthPath" placeholder="/health" />
      </el-form-item>
      <el-form-item label="连接状态">
        <span v-if="connectionStatus" :class="connectionStatus.ok ? 'status-ok' : 'status-error'">
          {{ connectionStatus.message }}
        </span>
        <span v-else class="status-idle">尚未测试</span>
      </el-form-item>
    </el-form>

    <div class="config-tip">
      配置保存在本机用户目录，升级应用不会覆盖。修改后将立即用于新的接口请求。
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button :disabled="busy" @click="resetConfig">恢复默认</el-button>
      <el-button :loading="testing" @click="testConnection">测试连接</el-button>
      <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { setBaseURL } from '@/api/axiosConfig'
import {
  getRuntimeConfig,
  resetRuntimeConfig,
  saveRuntimeConfig,
  testRuntimeConnection
} from '@/utils/runtime-config'

export default {
  name: 'BackendSettings',
  data() {
    const validateBackendUrl = (rule, value, callback) => {
      if (!/^https?:\/\//i.test(String(value || '').trim())) {
        callback(new Error('请输入以 http:// 或 https:// 开头的地址'))
      } else {
        callback()
      }
    }

    return {
      visible: false,
      testing: false,
      saving: false,
      connectionStatus: null,
      form: {
        backendUrl: '',
        healthPath: '/health',
        timeout: 120000
      },
      rules: {
        backendUrl: [{ required: true, validator: validateBackendUrl, trigger: 'blur' }],
        healthPath: [{ required: true, message: '请输入健康检查路径', trigger: 'blur' }]
      }
    }
  },
  computed: {
    busy() {
      return this.testing || this.saving
    }
  },
  methods: {
    open() {
      this.visible = true
    },
    async loadConfig() {
      try {
        this.form = { ...await getRuntimeConfig() }
        this.connectionStatus = null
      } catch (error) {
        this.$message.error(`读取服务器配置失败：${error.message}`)
      }
    },
    validate() {
      return new Promise(resolve => {
        this.$refs.configForm.validate(valid => resolve(valid))
      })
    },
    async testConnection() {
      if (!await this.validate()) return
      this.testing = true
      this.connectionStatus = null
      try {
        const result = await testRuntimeConnection(this.form)
        this.connectionStatus = result.ok
          ? { ok: true, message: `连接成功（HTTP ${result.status}）` }
          : { ok: false, message: result.message || '连接失败' }
      } catch (error) {
        this.connectionStatus = { ok: false, message: error.message || '连接失败' }
      } finally {
        this.testing = false
      }
    },
    async saveConfig() {
      if (!await this.validate()) return
      this.saving = true
      try {
        const config = await saveRuntimeConfig(this.form)
        setBaseURL(config.backendUrl)
        this.form = { ...config }
        this.visible = false
        this.$message.success('服务器配置已保存')
        this.$emit('saved', config)
      } catch (error) {
        this.$message.error(`保存失败：${error.message}`)
      } finally {
        this.saving = false
      }
    },
    async resetConfig() {
      try {
        const config = await resetRuntimeConfig()
        setBaseURL(config.backendUrl)
        this.form = { ...config }
        this.connectionStatus = null
        this.$message.success('已恢复默认配置')
      } catch (error) {
        this.$message.error(`恢复失败：${error.message}`)
      }
    }
  }
}
</script>

<style scoped>
.config-tip {
  padding: 10px 14px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.status-ok { color: #0c8357; }
.status-error { color: #f56c6c; }
.status-idle { color: #909399; }
</style>
