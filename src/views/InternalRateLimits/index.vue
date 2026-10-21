<template>
  <div class="rate-limit-page">
    <section class="page-heading">
      <div>
        <h2>传输限速配置</h2>
        <p>配置保存后立即用于新创建的任务；已经创建或正在运行的任务保持原有限速。</p>
      </div>
      <el-button icon="el-icon-refresh" :loading="loading" @click="loadAll">刷新</el-button>
    </section>

    <el-alert
      title="这是内部管理页面，不会出现在主页或导航菜单中。自适应模式根据最近的网络测量结果为每个新任务计算限速；测量过期时按最近一次完整成功测量计算路径限速，并将两种模式的限速同时减半；没有完整测量时使用人工规则。"
      type="warning"
      :closable="false"
      show-icon
      class="notice"
    />

    <el-card v-loading="loading" shadow="never">
      <div slot="header" class="card-header">
        <span>当前配置（版本 {{ form.version || '—' }}）</span>
        <el-tag :type="form.enabled ? 'success' : 'danger'">{{ form.enabled ? '已启用' : '已禁用' }}</el-tag>
      </div>

      <el-form label-width="120px">
        <el-form-item label="启用限速">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="自适应限速">
          <el-switch v-model="form.adaptiveEnabled" />
          <div class="help">启用后，新任务按近期实测带宽、目标加速比和安全系数动态计算；无需重新部署。</div>
        </el-form-item>
        <el-form-item label="定时带宽测量">
          <el-switch v-model="form.bandwidthProbeEnabled" />
          <div class="help">默认关闭。开启后每 5 分钟尝试一次主动测量；检测到对应链路正在传输业务数据时，本轮直接跳过。</div>
        </el-form-item>
        <el-form-item label="目标加速比">
          <div class="target-range">
            <el-input-number v-model="form.targetMin" :min="0.001" :max="100" :precision="3" :step="0.01" />
            <span>至</span>
            <el-input-number v-model="form.targetMax" :min="0.001" :max="100" :precision="3" :step="0.01" />
          </div>
          <div class="help">自适应模式在区间上部选择工作点，为任务固定开销留出余量；实际结果允许在该区间内波动。</div>
        </el-form-item>
        <el-form-item v-if="form.adaptiveEnabled" label="中心节点">
          <el-input v-model.trim="form.adaptiveCentralNode" class="rate-input" placeholder="例如 master-40" />
        </el-form-item>
        <el-form-item v-if="form.adaptiveEnabled" label="带宽安全系数">
          <el-input-number v-model="form.adaptiveSafetyFactor" :min="0.1" :max="0.99" :precision="3" :step="0.05" />
          <div class="help">建议 0.8。只使用实测可用带宽的一部分，给实时波动和其他流量留出余量。</div>
        </el-form-item>
        <el-form-item v-if="form.adaptiveEnabled" label="测量有效期">
          <el-input-number v-model="form.measurementMaxAgeSeconds" :min="60" :max="86400" :step="60" />
          <span class="unit">秒</span>
          <div class="help">超过有效期的测量不会参与计算，系统会改用下面的人工回退规则。</div>
        </el-form-item>
        <el-form-item label="默认限速">
          <el-input v-model.trim="form.defaultRate" clearable placeholder="可留空，例如 960k" class="rate-input" />
          <div class="help">没有命中任何路径规则时使用。留空表示未命中路径不限制速率。</div>
        </el-form-item>
      </el-form>

      <div class="table-heading">
        <div><strong>人工回退规则</strong><span class="help inline">自适应测量不可用时按顺序匹配；* 表示任意节点。</span></div>
        <el-button type="primary" plain icon="el-icon-plus" @click="addRule">新增规则</el-button>
      </div>
      <el-table :data="form.rules" border row-key="key">
        <el-table-column label="优先级" width="80"><template slot-scope="s">{{ s.$index + 1 }}</template></el-table-column>
        <el-table-column label="源节点" min-width="180"><template slot-scope="s"><el-input v-model.trim="s.row.source" placeholder="节点名或 *" /></template></el-table-column>
        <el-table-column label="目标节点" min-width="180"><template slot-scope="s"><el-input v-model.trim="s.row.target" placeholder="节点名或 *" /></template></el-table-column>
        <el-table-column label="限速" min-width="150"><template slot-scope="s"><el-input v-model.trim="s.row.rate" placeholder="例如 960k" /></template></el-table-column>
        <el-table-column label="操作" width="190">
          <template slot-scope="s">
            <el-button type="text" :disabled="s.$index === 0" @click="moveRule(s.$index, -1)">上移</el-button>
            <el-button type="text" :disabled="s.$index === form.rules.length - 1" @click="moveRule(s.$index, 1)">下移</el-button>
            <el-button type="text" class="danger" @click="removeRule(s.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="save-row">
        <span class="help">最近更新：{{ updatedText }}</span>
        <el-button type="primary" :loading="saving" @click="save">保存并立即生效</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="preview-card">
      <div slot="header"><strong>新任务限速预览</strong></div>
      <div class="preview-row">
        <el-input v-model.trim="previewSource" placeholder="源节点，例如 cluster-sz-3" />
        <span>→</span>
        <el-input v-model.trim="previewTarget" placeholder="目标节点，例如 master-40" />
        <el-button type="primary" plain :loading="previewing" @click="preview">按当前网络计算</el-button>
      </div>
      <el-alert v-if="previewResult" :closable="false" type="info" show-icon class="preview-result">
        <template slot="title">
          本次限速 {{ previewResult.rate || '不限速' }}；来源 {{ sourceLabel(previewResult.source) }}；
          带宽基准 {{ previewResult.basisBandwidthMbps == null ? '不可用' : `${previewResult.basisBandwidthMbps} Mbps` }}；
          计算目标 {{ previewResult.targetRatio == null ? '—' : previewResult.targetRatio }}
        </template>
      </el-alert>
    </el-card>

    <el-card shadow="never" class="history-card">
      <div slot="header"><strong>版本历史</strong></div>
      <el-table :data="history" border>
        <el-table-column prop="version" label="版本" width="90" />
        <el-table-column label="状态" width="90"><template slot-scope="s"><el-tag size="mini" :type="s.row.enabled ? 'success' : 'info'">{{ s.row.enabled ? '启用' : '禁用' }}</el-tag></template></el-table-column>
        <el-table-column label="模式" width="100"><template slot-scope="s">{{ s.row.adaptiveEnabled ? '自适应' : '人工' }}</template></el-table-column>
        <el-table-column label="定时测量" width="100"><template slot-scope="s">{{ s.row.bandwidthProbeEnabled ? '开启' : '关闭' }}</template></el-table-column>
        <el-table-column label="目标区间" width="130"><template slot-scope="s">{{ s.row.targetMin }}–{{ s.row.targetMax }}</template></el-table-column>
        <el-table-column prop="pathRules" label="路径规则" min-width="300" show-overflow-tooltip />
        <el-table-column prop="updatedBy" label="操作人" width="130" />
        <el-table-column label="更新时间" width="190"><template slot-scope="s">{{ formatTime(s.row.updatedAt) }}</template></el-table-column>
        <el-table-column label="操作" width="90"><template slot-scope="s"><el-button type="text" :disabled="s.row.version === form.version" @click="rollback(s.row)">恢复</el-button></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { fetchRateLimitConfiguration, fetchRateLimitHistory, previewRateLimit, rollbackRateLimitConfiguration, updateRateLimitConfiguration } from '@/api/adminApi'

const RATE = /^\d+(?:\.\d+)?[kKmMgG]?$/
let nextKey = 1

const parseRules = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean).map(item => {
  const arrow = item.indexOf('->')
  const equals = item.lastIndexOf('=')
  return { key: nextKey++, source: item.slice(0, arrow).trim(), target: item.slice(arrow + 2, equals).trim(), rate: item.slice(equals + 1).trim() }
})
const serializeRules = rules => rules.map(rule => `${rule.source}->${rule.target}=${rule.rate}`).join(',')

export default {
  name: 'InternalRateLimits',
  data() {
    return {
      loading: false,
      saving: false,
      previewing: false,
      previewSource: 'cluster-sz-3',
      previewTarget: 'master-40',
      previewResult: null,
      history: [],
      form: { version: null, enabled: true, adaptiveEnabled: true, bandwidthProbeEnabled: false, defaultRate: '', targetMin: 1.4, targetMax: 1.5, adaptiveSafetyFactor: 0.8, measurementMaxAgeSeconds: 900, adaptiveCentralNode: 'master-40', rules: [], updatedBy: '', updatedAt: null }
    }
  },
  computed: {
    updatedText() { return this.form.updatedAt ? `${this.formatTime(this.form.updatedAt)}，${this.form.updatedBy || '未知用户'}` : '—' }
  },
  created() { this.loadAll() },
  methods: {
    applyConfiguration(value) {
      this.form = {
        version: value.version,
        enabled: value.enabled !== false,
        adaptiveEnabled: value.adaptiveEnabled === true,
        bandwidthProbeEnabled: value.bandwidthProbeEnabled === true,
        defaultRate: value.defaultRate || '',
        targetMin: Number(value.targetMin),
        targetMax: Number(value.targetMax),
        adaptiveSafetyFactor: Number(value.adaptiveSafetyFactor == null ? 0.8 : value.adaptiveSafetyFactor),
        measurementMaxAgeSeconds: Number(value.measurementMaxAgeSeconds || 900),
        adaptiveCentralNode: value.adaptiveCentralNode || 'master-40',
        rules: parseRules(value.pathRules),
        updatedBy: value.updatedBy || '',
        updatedAt: value.updatedAt || null
      }
    },
    async loadAll() {
      this.loading = true
      try {
        const [current, history] = await Promise.all([fetchRateLimitConfiguration(), fetchRateLimitHistory(20)])
        this.applyConfiguration(current)
        this.history = Array.isArray(history) ? history : []
      } catch (error) {
        this.$message.error(`限速配置加载失败：${error.message}`)
      } finally { this.loading = false }
    },
    addRule() { this.form.rules.push({ key: nextKey++, source: '*', target: '', rate: '' }) },
    removeRule(index) { this.form.rules.splice(index, 1) },
    moveRule(index, offset) { const target = index + offset; if (target < 0 || target >= this.form.rules.length) return; const item = this.form.rules.splice(index, 1)[0]; this.form.rules.splice(target, 0, item) },
    validate() {
      if (!(this.form.targetMin > 0) || this.form.targetMax < this.form.targetMin) return '目标加速比区间无效'
      if (!(this.form.adaptiveSafetyFactor >= 0.1 && this.form.adaptiveSafetyFactor <= 0.99)) return '带宽安全系数必须在 0.1 到 0.99 之间'
      if (!(this.form.measurementMaxAgeSeconds >= 60 && this.form.measurementMaxAgeSeconds <= 86400)) return '测量有效期必须在 60 到 86400 秒之间'
      if (!this.form.adaptiveCentralNode) return '中心节点不能为空'
      if (this.form.defaultRate && !RATE.test(this.form.defaultRate)) return '默认限速格式无效'
      for (let i = 0; i < this.form.rules.length; i++) {
        const rule = this.form.rules[i]
        if (!rule.source || !rule.target || !RATE.test(rule.rate)) return `第 ${i + 1} 条路径规则不完整或限速格式无效`
        if (rule.source.includes(',') || rule.source.includes('->') || rule.source.includes('=') || rule.target.includes(',') || rule.target.includes('->') || rule.target.includes('=')) return `第 ${i + 1} 条路径规则包含保留字符`
      }
      if (this.form.enabled && !this.form.adaptiveEnabled && !this.form.defaultRate && !this.form.rules.length) return '人工模式至少需要一条路径规则或默认限速'
      return null
    },
    async save() {
      const error = this.validate()
      if (error) { this.$message.error(error); return }
      this.saving = true
      try {
        const updated = await updateRateLimitConfiguration({ version: this.form.version, enabled: this.form.enabled, adaptiveEnabled: this.form.adaptiveEnabled, bandwidthProbeEnabled: this.form.bandwidthProbeEnabled, defaultRate: this.form.defaultRate, pathRules: serializeRules(this.form.rules), targetMin: this.form.targetMin, targetMax: this.form.targetMax, adaptiveSafetyFactor: this.form.adaptiveSafetyFactor, measurementMaxAgeSeconds: this.form.measurementMaxAgeSeconds, adaptiveCentralNode: this.form.adaptiveCentralNode })
        this.applyConfiguration(updated)
        this.history = await fetchRateLimitHistory(20)
        this.$message.success('限速配置已保存，将用于后续创建的任务')
      } catch (saveError) {
        this.$message.error(`保存失败：${saveError.message}`)
      } finally { this.saving = false }
    },
    async preview() {
      if (!this.previewSource || !this.previewTarget) { this.$message.error('请输入源节点和目标节点'); return }
      this.previewing = true
      try { this.previewResult = await previewRateLimit(this.previewSource, this.previewTarget) } catch (error) {
        this.$message.error(`预览失败：${error.message}`)
      } finally { this.previewing = false }
    },
    sourceLabel(value) {
      if (value === 'database-adaptive') return '近期网络测量'
      if (value === 'database-last-measurement-fallback') return '最近一次成功测量（已过期）'
      if (value && value.includes('static-fallback')) return '人工回退规则'
      return value || '未知'
    },
    async rollback(item) {
      try {
        await this.$confirm(`恢复版本 ${item.version} 的配置？恢复操作会生成一个新版本。`, '恢复限速配置', { type: 'warning' })
        const updated = await rollbackRateLimitConfiguration({ version: this.form.version, restoreVersion: item.version })
        this.applyConfiguration(updated)
        this.history = await fetchRateLimitHistory(20)
        this.$message.success(`已恢复版本 ${item.version} 的配置`)
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error(`恢复失败：${error.message}`)
      }
    },
    formatTime(value) { return value ? String(value).replace('T', ' ').replace(/\.\d+$/, '') : '—' }
  }
}
</script>

<style scoped>
.rate-limit-page { min-height: calc(100vh - 90px); padding: 22px; background: #f4f7fa; }
.page-heading, .card-header, .table-heading, .save-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.page-heading { margin-bottom: 16px; }.page-heading h2 { margin: 0 0 7px; color: #1f3447; }.page-heading p { margin: 0; color: #7b8995; font-size: 13px; }
.notice { margin-bottom: 16px; }.target-range { display: flex; align-items: center; gap: 10px; }.rate-input { width: 280px; }.unit { margin-left: 8px; color: #667785; }
.help { color: #7b8995; font-size: 12px; line-height: 20px; }.help.inline { margin-left: 12px; }.table-heading { margin: 10px 0 12px; }
.save-row { margin-top: 18px; }.preview-card,.history-card { margin-top: 18px; }.preview-row { display: flex; align-items: center; gap: 12px; }.preview-row .el-input { max-width: 300px; }.preview-result { margin-top: 14px; }.danger { color: #f56c6c; }
@media(max-width:768px){.page-heading,.table-heading,.save-row{align-items:stretch;flex-direction:column}.target-range{align-items:flex-start;flex-direction:column}.rate-input{width:100%}}
</style>
