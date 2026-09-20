<template>
  <main class="workspace-page">
    <section class="hero-card">
      <div>
        <span class="eyebrow">TOPIC4 · 原位调度与隐私协同计算</span>
        <h1>业务工作台</h1>
        <p>从资源与数据准备开始，进入协同计算和任务运行，最后查看系统日志与原始证据。</p>
      </div>
      <div class="hero-actions">
        <router-link v-if="isDataOwner" to="/collaboration/jobs/new"><el-button type="primary">发起隐私计算</el-button></router-link>
        <router-link to="/resources/datasets/register"><el-button>注册数据集</el-button></router-link>
      </div>
    </section>

    <section class="metric-grid" aria-label="系统概览">
      <article v-for="item in metrics" :key="item.key" class="metric-card">
        <div class="metric-icon" :class="item.tone"><i :class="item.icon" /></div>
        <div>
          <span>{{ item.label }}</span>
          <strong v-if="!item.loading">{{ item.value }}</strong>
          <i v-else class="el-icon-loading metric-loading" />
          <small>{{ item.note }}</small>
        </div>
      </article>
    </section>

    <section class="workspace-grid">
      <article class="panel flow-panel">
        <header><div><h2>业务流程</h2><p>按实际工作顺序进入各功能域</p></div></header>
        <div class="flow-list">
          <router-link v-for="(step, index) in flow" :key="step.path" :to="step.path" class="flow-item">
            <span class="step-index">{{ index + 1 }}</span>
            <div><strong>{{ step.title }}</strong><small>{{ step.description }}</small></div>
            <i class="el-icon-arrow-right" />
          </router-link>
        </div>
      </article>

      <article class="panel privacy-panel">
        <header>
          <div><h2>隐私协同状态</h2><p>{{ name }} · {{ roleNames }}<span v-if="domainName"> · {{ domainName }}</span></p></div>
          <el-tag type="success">已登录</el-tag>
        </header>
        <template>
          <div class="privacy-stat"><span>等待审批</span><strong>{{ privacySummary.awaiting }}</strong></div>
          <div class="privacy-stat"><span>执行中</span><strong>{{ privacySummary.running }}</strong></div>
          <div class="privacy-stat"><span>已完成</span><strong>{{ privacySummary.succeeded }}</strong></div>
          <router-link to="/collaboration/jobs" class="panel-link">查看全部协同任务 <i class="el-icon-right" /></router-link>
        </template>
      </article>
    </section>

    <el-alert
      v-if="errors.length"
      :title="`部分概览数据暂不可用：${errors.join('；')}`"
      type="warning"
      :closable="false"
      show-icon
    />
  </main>
</template>

<script>
import { fetchRegisteredDatasets, fetchRegisteredNodes, fetchRuntimeImages } from '@/api/registrationApi'
import { fetchTaskList } from '@/api/managementCenterApi'
import { fetchPrivacyCapabilities, fetchPrivacyJobs, fetchPrivacyTemplates } from '@/api/privacyComputingApi'

const count = result => Number(result && result.total) || (Array.isArray(result) ? result.length : 0)

export default {
  name: 'Workspace',
  data() {
    return {
      loading: true,
      overview: { nodes: '—', datasets: '—', images: '—', templates: '—', tasks: '—' },
      privacySummary: { awaiting: 0, running: 0, succeeded: 0 },
      errors: [],
      flow: [
        { title: '资源与数据', description: '准备节点、网络、数据集和运行镜像', path: '/resources/nodes' },
        { title: '协同计算', description: '选择固定协议模板并创建隐私任务', path: '/collaboration/capabilities' },
        { title: '任务运行', description: '查看任务、调度结果和性能分析', path: '/operations/tasks' },
        { title: '系统日志', description: '检查异常访问、调度执行和隐私计算日志', path: '/logs/abnormal-access' }
      ]
    }
  },
  computed: {
    name() { return this.$store.getters.name || this.$store.getters.username },
    roles() { return this.$store.getters.roles || [] },
    isDataOwner() { return this.roles.includes('DATA_OWNER') },
    roleNames() { return this.roles.map(role => ({ ADMIN: '管理员', DATA_OWNER: '数据持有者', AUDITOR: '审计员' })[role] || role).join('、') },
    domainName() { const domain = this.$store.getters.domain; return domain && (domain.name || domain.domainName) },
    metrics() {
      return [
        { key: 'nodes', label: '活动节点', value: this.overview.nodes, note: '已注册且可调度', icon: 'el-icon-cpu', tone: 'blue', loading: this.loading },
        { key: 'datasets', label: '活动数据集', value: this.overview.datasets, note: '可用于任务绑定', icon: 'el-icon-coin', tone: 'green', loading: this.loading },
        { key: 'images', label: '运行镜像', value: this.overview.images, note: '已登记镜像', icon: 'el-icon-box', tone: 'violet', loading: this.loading },
        { key: 'templates', label: '协议模板', value: this.overview.templates, note: '当前可用模板', icon: 'el-icon-lock', tone: 'orange', loading: this.loading },
        { key: 'tasks', label: '普通任务', value: this.overview.tasks, note: '任务目录记录', icon: 'el-icon-s-operation', tone: 'cyan', loading: this.loading }
      ]
    }
  },
  created() { this.loadOverview() },
  methods: {
    async loadOverview() {
      this.loading = true
      this.errors = []
      const requests = [
        ['nodes', '节点', fetchRegisteredNodes({ page: 1, pageSize: 1, status: 'ACTIVE', enabled: true }, { silent: true })],
        ['datasets', '数据集', fetchRegisteredDatasets({ page: 1, pageSize: 1, status: 'ACTIVE' }, { silent: true })],
        ['images', '运行镜像', fetchRuntimeImages({ page: 1, pageSize: 1 })],
        ['tasks', '普通任务', fetchTaskList(1, 1, '', { silent: true })]
      ]
      const catalog = Promise.all([fetchPrivacyCapabilities({ silent: true }), fetchPrivacyTemplates({ silent: true })])
      const results = await Promise.allSettled([...requests.map(item => item[2]), catalog])
      requests.forEach((item, index) => {
        if (results[index].status === 'fulfilled') this.overview[item[0]] = count(results[index].value)
        else this.errors.push(item[1])
      })
      const catalogResult = results[results.length - 1]
      if (catalogResult.status === 'fulfilled') {
        const templates = catalogResult.value[1] || []
        this.overview.templates = templates.filter(item => item.available).length
      } else this.errors.push('协议模板')
      this.loading = false
      await this.loadPrivacySummary()
    },
    async loadPrivacySummary() {
      this.privacySummary = { awaiting: 0, running: 0, succeeded: 0 }
      try {
        const jobs = await fetchPrivacyJobs({ limit: 100 }, { silent: true })
        const rows = Array.isArray(jobs) ? jobs : ((jobs && jobs.list) || [])
        this.privacySummary.awaiting = rows.filter(item => item.status === 'AWAITING_APPROVAL').length
        this.privacySummary.running = rows.filter(item => ['QUEUED', 'PREPARING', 'RUNNING', 'FINALIZING'].includes(item.status)).length
        this.privacySummary.succeeded = rows.filter(item => item.status === 'SUCCEEDED').length
      } catch (error) {
        if (!this.errors.includes('隐私任务')) this.errors.push('隐私任务')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.workspace-page { min-height: calc(100vh - 90px); padding: 24px; background: #f4f7fa; color: #263b4d; }
.hero-card { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 28px 30px; border-radius: 12px; color: #fff; background: linear-gradient(120deg, #202231 0%, #245f56 100%); box-shadow: 0 10px 28px rgba(24, 48, 57, .15); }
.eyebrow { color: #89dcc1; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.hero-card h1 { margin: 8px 0; font-size: 28px; }
.hero-card p { max-width: 700px; margin: 0; color: #d9e5e3; line-height: 1.7; }
.hero-actions { display: flex; flex-shrink: 0; gap: 10px; }
.metric-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
.metric-card { display: flex; align-items: center; gap: 13px; min-height: 116px; padding: 18px; border: 1px solid #e6ebef; border-radius: 10px; background: #fff; box-shadow: 0 3px 12px rgba(35, 58, 73, .04); }
.metric-card > div:last-child { display: flex; min-width: 0; flex-direction: column; }
.metric-card span, .metric-card small { color: #7b8994; }
.metric-card strong { margin: 3px 0; color: #203548; font-size: 27px; }
.metric-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; flex: 0 0 42px; border-radius: 10px; font-size: 20px; }
.blue { color: #3b78ad; background: #eaf3fa; }.green { color: #0c8357; background: #e7f5ef; }.violet { color: #7356a8; background: #f0ecf8; }.orange { color: #b87522; background: #fff3e3; }.cyan { color: #247f8a; background: #e9f6f7; }
.metric-loading { margin: 9px 0; font-size: 20px; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(300px, .8fr); gap: 18px; margin-bottom: 18px; }
.panel { padding: 22px; border: 1px solid #e4eaee; border-radius: 10px; background: #fff; }
.panel header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.panel h2 { margin: 0 0 5px; font-size: 18px; }.panel header p { margin: 0; color: #87949d; font-size: 13px; }
.flow-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.flow-item { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #e6ebef; border-radius: 8px; transition: .2s ease; }
.flow-item:hover { border-color: #7cbda4; transform: translateY(-1px); box-shadow: 0 5px 14px rgba(12, 131, 87, .08); }
.flow-item > div { display: flex; min-width: 0; flex: 1; flex-direction: column; }.flow-item small { margin-top: 4px; color: #84919b; }
.step-index { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; color: #fff; background: #0c8357; font-weight: 700; }
.privacy-stat { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #edf0f2; color: #62717c; }.privacy-stat strong { color: #263b4d; font-size: 20px; }
.panel-link { display: inline-block; margin-top: 16px; color: #0c8357; font-weight: 600; }
.credential-empty { padding: 28px 10px; text-align: center; color: #7b8993; }.credential-empty i { display: block; margin-bottom: 12px; color: #9aa7af; font-size: 32px; }.credential-empty strong { color: #3d5262; }.credential-empty p { margin: 8px 0 0; font-size: 13px; line-height: 1.6; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(3, 1fr); }.workspace-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .workspace-page { padding: 14px; }.hero-card { align-items: flex-start; flex-direction: column; }.metric-grid { grid-template-columns: 1fr 1fr; }.flow-list { grid-template-columns: 1fr; } }
</style>
