<template>
  <el-container class="privacy-page">
    <el-main>
      <section class="page-heading">
        <div><h2>{{ pageTitle }}</h2><p>{{ pageDescription }}</p></div>
        <el-button icon="el-icon-refresh" :loading="loading" @click="refreshActive">刷新</el-button>
      </section>
      <el-alert title="系统提供协议功能和逻辑域隔离，不声明能够抵御同一 Kubernetes 集群管理员；结果与证据仍由人工判定。" type="warning" :closable="false" show-icon />

      <el-tabs v-model="activeTab" class="workspace-card" @tab-click="onTabClick">
        <el-tab-pane label="能力说明" name="capabilities">
          <div class="section-heading"><div><h3>协议执行引擎</h3><span>安全档位、版本与镜像摘要来自后端注册表</span></div></div>
          <el-table v-loading="catalogLoading" :data="capabilities" border size="small" empty-text="暂无执行引擎">
            <el-table-column label="引擎" min-width="170"><template slot-scope="s"><strong>{{ s.row.displayName || s.row.provider }}</strong><div class="muted mono">{{ s.row.provider }}</div></template></el-table-column>
            <el-table-column label="状态" width="110"><template slot-scope="s"><el-tag size="mini" :type="availabilityTag(s.row.status)">{{ availabilityText(s.row.status) }}</el-tag></template></el-table-column>
            <el-table-column prop="version" label="版本" min-width="120" />
            <el-table-column label="安全档位" min-width="190"><template slot-scope="s"><el-tag v-for="profile in arrayValue(s.row.securityProfiles)" :key="profile" size="mini" class="tag" effect="plain">{{ securityText(profile) }}</el-tag></template></el-table-column>
            <el-table-column label="能力" min-width="240"><template slot-scope="s"><el-tag v-for="operation in arrayValue(s.row.operations)" :key="operation" size="mini" class="tag" type="info">{{ operation }}</el-tag></template></el-table-column>
            <el-table-column label="镜像摘要" min-width="210"><template slot-scope="s"><span class="mono">{{ s.row.imageDigest || '未配置' }}</span></template></el-table-column>
          </el-table>
          <div class="section-heading spaced"><div><h3>固定模板</h3><span>模板锁定 Provider 与安全档位，不自动降级</span></div></div>
          <el-table :data="templates" border size="small" empty-text="暂无协议模板">
            <el-table-column label="模板" min-width="200"><template slot-scope="s"><strong>{{ s.row.displayName || s.row.templateId }}</strong><div class="muted mono">{{ s.row.templateId }}</div></template></el-table-column>
            <el-table-column prop="provider" label="Provider" min-width="150" />
            <el-table-column label="参与槽位" width="110"><template slot-scope="s">{{ templateSlots(s.row).length }} 方</template></el-table-column>
            <el-table-column label="安全档位" min-width="170"><template slot-scope="s">{{ securityText(s.row.securityProfile) }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template slot-scope="s"><el-tag size="mini" :type="s.row.available ? 'success' : 'danger'">{{ s.row.available ? '可用' : '不可用' }}</el-tag></template></el-table-column>
            <el-table-column prop="leakageDisclosure" label="泄露与限制说明" min-width="320" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="isDataOwner" label="发起计算" name="create">
          <el-form label-position="top" class="job-form">
            <el-row :gutter="18"><el-col :xs="24" :md="17"><el-form-item label="协议模板" required><el-select v-model="jobForm.templateId" filterable style="width:100%" placeholder="选择固定模板" @change="applyTemplate"><el-option v-for="item in templates" :key="item.templateId" :value="item.templateId" :label="`${item.displayName || item.templateId} · ${securityText(item.securityProfile)}`" :disabled="!item.available" /></el-select></el-form-item></el-col><el-col :xs="24" :md="7"><el-form-item label="超时（秒）"><el-input-number v-model="jobForm.timeoutSeconds" :min="60" :max="selectedTemplate ? selectedTemplate.maxTimeoutSeconds || 3600 : 3600" :step="60" controls-position="right" style="width:100%" @change="invalidatePreflight" /></el-form-item></el-col></el-row>
            <el-alert v-if="selectedTemplate" :title="selectedTemplate.leakageDisclosure || '模板未声明额外泄露'" :description="`${selectedTemplate.provider} · ${securityText(selectedTemplate.securityProfile)}`" :type="selectedTemplate.experimental ? 'warning' : 'info'" :closable="false" show-icon />

            <div class="section-heading spaced"><div><h3>选择参与数据</h3><span>每个槽位选择一个不同业务域的数据集；持有者同意后才会开始计算</span></div></div>
            <el-row :gutter="14">
              <el-col v-for="input in jobForm.inputs" :key="input.slotId" :xs="24" :lg="8">
                <div class="slot-card">
                  <div class="slot-title"><span class="slot-badge">{{ input.slotId }}</span><div><strong>{{ roleText(input.role) }}</strong><div class="muted">{{ input.label || '参与数据' }}</div></div></div>
                  <el-form-item label="数据集" required>
                    <el-select v-model="input.datasetId" filterable style="width:100%" placeholder="按域和持有者选择" @change="syncInputDataset(input)">
                      <el-option-group v-for="group in datasetGroups" :key="group.key" :label="group.label"><el-option v-for="dataset in group.datasets" :key="dataset.datasetId" :label="`${dataset.name || dataset.datasetCode} · ${dataset.version}`" :value="dataset.datasetId"><span>{{ dataset.name || dataset.datasetCode }}</span><span class="option-owner">{{ datasetOwnerName(dataset) }}</span></el-option></el-option-group>
                    </el-select>
                  </el-form-item>
                  <div v-if="input.datasetId" class="snapshot"><div><span>持有者</span>{{ input.ownerName }}</div><div><span>业务域</span>{{ input.domainName }}</div><div><span>版本</span>{{ input.datasetVersion }}</div><div><span>摘要</span><code>{{ input.displaySha256 || '后端创建时校验' }}</code></div></div>
                  <el-form-item label="字段绑定" required><el-select v-model="input.fields" multiple filterable style="width:100%" placeholder="从数据 schema 选择" @change="invalidatePreflight"><el-option v-for="field in inputFieldOptions(input)" :key="field" :label="field" :value="field" /></el-select></el-form-item>
                </div>
              </el-col>
            </el-row>

            <div v-if="selectedTemplate" class="policy-card">
              <div class="section-heading"><div><h3>模板参数</h3><span>只提交模板白名单参数</span></div></div>
              <el-row :gutter="16">
                <el-col v-if="jobForm.templateId === 'private-stats-3p-v1'" :sm="8"><el-form-item label="定点精度"><el-input-number v-model="jobForm.enginePolicy.scale" :min="1" controls-position="right" @change="invalidatePreflight" /></el-form-item></el-col>
                <template v-if="jobForm.templateId.indexOf('psi-') === 0"><el-col :sm="12"><el-form-item label="对齐键"><el-select v-model="jobForm.enginePolicy.keyColumns" multiple style="width:100%" @change="invalidatePreflight"><el-option v-for="field in commonFields" :key="field" :label="field" :value="field" /></el-select></el-form-item></el-col><el-col :sm="12"><el-form-item label="输出方式"><el-select v-model="jobForm.enginePolicy.outputMode" style="width:100%" @change="invalidatePreflight"><el-option label="仅接收方" value="RECEIVER_ONLY" /><el-option label="全部参与方" value="ALL_PARTIES" /></el-select></el-form-item></el-col></template>
                <template v-if="jobForm.templateId === 'he-paillier-2p-v1'"><el-col :sm="12"><el-form-item label="同态操作"><el-select v-model="jobForm.enginePolicy.operation" style="width:100%" @change="invalidatePreflight"><el-option label="密文加法" value="ADD" /><el-option label="明文乘法" value="PLAINTEXT_MULTIPLY" /><el-option label="点积" value="DOT_PRODUCT" /></el-select></el-form-item></el-col><el-col :sm="12"><el-form-item label="定点精度"><el-input-number v-model="jobForm.enginePolicy.scale" :min="1" controls-position="right" @change="invalidatePreflight" /></el-form-item></el-col></template>
                <template v-if="isTrainingTemplate"><el-col :sm="8"><el-form-item label="训练轮次"><el-input-number v-model="jobForm.enginePolicy.epochs" :min="1" :max="5" @change="invalidatePreflight" /></el-form-item></el-col><el-col :sm="8"><el-form-item label="学习率"><el-input-number v-model="jobForm.enginePolicy.learningRate" :disabled="jobForm.templateId === 'hfl-fedavg-logreg-3p-v1'" :min="0.000001" :max="1" :step="0.01" @change="invalidatePreflight" /></el-form-item></el-col><el-col :sm="8"><el-form-item label="随机种子"><el-input-number v-model="jobForm.enginePolicy.seed" :disabled="jobForm.templateId === 'hfl-fedavg-logreg-3p-v1'" :min="0" @change="invalidatePreflight" /></el-form-item></el-col></template>
                <el-col v-if="!hasEditablePolicy" :span="24"><el-alert title="该模板采用固定执行参数。" type="info" :closable="false" /></el-col>
              </el-row>
            </div>
            <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon class="feedback" />
            <el-alert v-if="domainConflict" title="同一任务中的数据必须来自不同业务域。" type="error" :closable="false" show-icon class="feedback" />
            <div class="form-actions"><el-button :loading="preflightLoading" :disabled="!canPreflight" @click="runPreflight">预检</el-button><el-button type="primary" :loading="creating" :disabled="!canCreate" @click="createJob">提交并等待持有者审批</el-button><span v-if="preflight && preflight.specDigest" class="muted mono">{{ preflight.specDigest }}</span></div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="isDataOwner" label="待我审批" name="approvals">
          <el-alert title="这里只展示由当前账号持有数据且尚未决策的请求。批准后不可撤销；拒绝必须填写理由。" type="info" :closable="false" show-icon />
          <el-table v-loading="approvalsLoading" :data="pendingApprovals" border class="list-table" empty-text="暂无待审批任务" @row-click="openApproval">
            <el-table-column label="任务" min-width="200"><template slot-scope="s"><strong class="link">{{ jobIdOf(s.row) }}</strong><div class="muted">{{ templateName(jobOf(s.row).templateId) }}</div></template></el-table-column>
            <el-table-column label="发起者" min-width="140"><template slot-scope="s">{{ initiatorName(jobOf(s.row)) }}</template></el-table-column>
            <el-table-column label="涉及数据" min-width="200"><template slot-scope="s">{{ approvalDatasetName(s.row) }}</template></el-table-column>
            <el-table-column label="创建时间" min-width="170"><template slot-scope="s">{{ formatTime(jobOf(s.row).createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="100"><template slot-scope="s"><el-button type="text" @click.stop="openApproval(s.row)">审阅</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="全部任务" name="jobs">
          <div class="jobs-toolbar"><el-select v-model="statusFilter" clearable placeholder="全部状态" @change="loadJobs"><el-option v-for="status in statuses" :key="status" :value="status" :label="statusText(status)" /></el-select><span>仅展示我发起或持有数据的任务；管理员和审计员可查看全量元数据。</span></div>
          <el-table v-loading="jobsLoading" :data="jobs" border empty-text="暂无可见任务" @row-click="openJob">
            <el-table-column prop="jobId" label="任务 ID" min-width="210"><template slot-scope="s"><strong class="link mono">{{ s.row.jobId }}</strong></template></el-table-column>
            <el-table-column label="模板" min-width="190"><template slot-scope="s">{{ templateName(s.row.templateId) }}</template></el-table-column>
            <el-table-column label="发起者" min-width="130"><template slot-scope="s">{{ initiatorName(s.row) }}</template></el-table-column>
            <el-table-column label="状态" width="140"><template slot-scope="s"><el-tag :type="statusTag(s.row.status)">{{ statusText(s.row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="创建时间" min-width="170"><template slot-scope="s">{{ formatTime(s.row.createdAt) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <el-drawer title="隐私计算任务详情" :visible.sync="detailVisible" size="52%" append-to-body>
        <div v-if="selectedJob" v-loading="detailLoading" class="detail-body">
          <div class="detail-title"><div><h3>{{ selectedJob.jobId }}</h3><span>{{ templateName(selectedJob.templateId) }} · {{ initiatorName(selectedJob) }} 发起</span></div><el-tag :type="statusTag(selectedJob.status)">{{ statusText(selectedJob.status) }}</el-tag></div>
          <el-alert :title="selectedTemplateForJob.leakageDisclosure || '请核对参与数据和字段后再做决定。'" type="warning" :closable="false" show-icon />
          <h4>参与数据与审批</h4>
          <el-table :data="jobInputs" border size="small"><el-table-column label="槽位" width="80"><template slot-scope="s">{{ s.row.slotId || s.row.partyId }}</template></el-table-column><el-table-column label="数据集" min-width="170"><template slot-scope="s">{{ s.row.datasetName || s.row.name || `#${s.row.datasetId}` }}<div class="muted">版本 {{ s.row.datasetVersion || s.row.version }}</div></template></el-table-column><el-table-column label="持有者 / 域" min-width="180"><template slot-scope="s">{{ s.row.ownerDisplayName || s.row.ownerUsername || s.row.ownerName || '—' }}<div class="muted">{{ s.row.ownerDomainName || s.row.ownerDomainCode || s.row.domainName || '—' }}</div></template></el-table-column><el-table-column label="字段" min-width="160"><template slot-scope="s">{{ arrayValue(s.row.fields).join('、') || '—' }}</template></el-table-column><el-table-column label="审批" width="110"><template slot-scope="s"><el-tag size="mini" :type="approvalTag(approvalState(s.row))">{{ approvalText(approvalState(s.row)) }}</el-tag></template></el-table-column></el-table>
          <div v-if="approvalMode" class="decision-panel"><el-input v-model="decisionReason" type="textarea" :rows="3" placeholder="审批备注；拒绝时必填" /><div><el-button type="danger" :loading="actionLoading === 'reject'" :disabled="!decisionReason.trim()" @click="decide('reject')">拒绝</el-button><el-button type="primary" :loading="actionLoading === 'approve'" @click="decide('approve')">同意并授权计算</el-button></div></div>
          <div v-else class="detail-actions"><el-button @click="loadArtifact('evidence', false)">查看证据</el-button><el-button @click="loadArtifact('evidence', true)">下载证据</el-button><el-button v-if="canReadResult" type="primary" @click="loadArtifact('result', false)">查看结果</el-button><el-button v-if="canReadResult" @click="loadArtifact('result', true)">下载结果</el-button><el-button v-if="canCancel" type="danger" plain @click="cancelSelectedJob">取消任务</el-button><el-button v-if="canRetry" @click="retrySelectedJob">重试</el-button></div>
          <h4>阶段事件</h4><el-timeline><el-timeline-item v-for="event in events" :key="event.eventId || `${event.timestamp}-${event.phase}`" :timestamp="formatTime(event.timestamp || event.createdAt)" :type="event.status === 'FAILED' || event.status === 'REJECTED' ? 'danger' : 'primary'"><strong>{{ event.phase || event.type }}</strong> · {{ event.status }}<div class="muted">{{ event.message || event.reason }}</div></el-timeline-item></el-timeline>
          <pre v-if="artifactData" class="artifact">{{ prettyJson(artifactData) }}</pre>
        </div>
      </el-drawer>
    </el-main>
  </el-container>
</template>

<script>
import { fetchRegisteredDatasets } from '@/api/registrationApi'
import { approvePrivacyJob, cancelPrivacyJob, createPrivacyJob, fetchPendingPrivacyApprovals, fetchPrivacyCapabilities, fetchPrivacyJob, fetchPrivacyJobEvidence, fetchPrivacyJobEvents, fetchPrivacyJobResult, fetchPrivacyJobs, fetchPrivacyTemplates, preflightPrivacyJob, privacyRequestId, rejectPrivacyJob, retryPrivacyJob } from '@/api/privacyComputingApi'
import { fetchAllPages } from '@/utils/dataset-catalog'

const TERMINAL = ['SUCCEEDED', 'FAILED', 'ABORTED', 'CANCELLED']
const DEFAULT_FIELDS = {
  'secure-sum-3p-v1': [['value'], ['value'], ['value']], 'private-stats-3p-v1': [['value'], ['value'], ['value']], 'private-threshold-3p-v1': [['value'], ['value'], ['value']],
  'psi-2p-v1': [['id'], ['id']], 'psi-3p-v1': [['id'], ['id'], ['id']], 'pir-keyword-2p-v1': [['query'], ['key', 'value']], 'he-paillier-2p-v1': [['value'], ['value']],
  'hfl-fedavg-logreg-3p-v1': [['x1', 'x2', 'label'], ['x1', 'x2', 'label'], ['x1', 'x2', 'label']], 'vfl-secureboost-2p-v1': [['id', 'x2', 'label'], ['id', 'x1']]
}
const listOf = value => Array.isArray(value) ? value : (value && Array.isArray(value.list) ? value.list : [])

export default {
  name: 'PrivacyComputing',
  data() {
    return {
      activeTab: (this.$route && this.$route.meta && this.$route.meta.privacyTab) || 'capabilities', loading: false, catalogLoading: false, jobsLoading: false, approvalsLoading: false, detailLoading: false, preflightLoading: false, creating: false, actionLoading: '',
      capabilities: [], templates: [], datasets: [], jobs: [], pendingApprovals: [], events: [], selectedJob: null, selectedApproval: null, detailVisible: false, decisionReason: '', artifactData: null, statusFilter: '', formError: '', preflight: null, preflightSpecJson: '',
      statuses: ['AWAITING_APPROVAL', 'QUEUED', 'PREPARING', 'RUNNING', 'FINALIZING', 'SUCCEEDED', 'FAILED', 'ABORTED'],
      jobForm: { templateId: '', inputs: [], timeoutSeconds: 1800, enginePolicy: {}}
    }
  },
  computed: {
    roles() { return this.$store.getters.roles || [] }, isDataOwner() { return this.roles.includes('DATA_OWNER') }, isAuditor() { return this.roles.includes('AUDITOR') },
    pageTitle() { return { capabilities: '隐私计算能力说明', create: '发起多方隐私计算', approvals: '待我审批', jobs: this.$route.meta && this.$route.meta.evidenceMode ? '隐私计算日志' : '全部隐私任务' }[this.activeTab] || '隐私协同计算' },
    pageDescription() { return { capabilities: '查看协议、安全档位、执行引擎和已知能力边界。', create: '选择模板及多个数据，系统向每个数据持有者发起授权审批。', approvals: '核对本人持有的数据、字段用途、协议和泄露说明后作出决定。', jobs: '跟踪审批、运行状态、结果权限和证据。' }[this.activeTab] },
    selectedTemplate() { return this.templates.find(item => item.templateId === this.jobForm.templateId) || null },
    selectedTemplateForJob() { return this.templates.find(item => this.selectedJob && item.templateId === this.selectedJob.templateId) || {} },
    datasetGroups() {
      const groups = {}
      this.datasets.filter(item => item.ownerUserId && (item.ownerDomainId || item.ownerDomain)).forEach(item => { const key = `${this.datasetDomainId(item)}:${item.ownerUserId}`; if (!groups[key]) groups[key] = { key, label: `${this.datasetDomainName(item)} · ${this.datasetOwnerName(item)}`, datasets: [] }; groups[key].datasets.push(item) })
      return Object.values(groups)
    },
    domainConflict() { const ids = this.jobForm.inputs.map(item => item.domainId).filter(Boolean).map(String); return new Set(ids).size !== ids.length },
    commonFields() { if (!this.jobForm.inputs.length) return []; return this.jobForm.inputs.map(input => this.inputFieldOptions(input)).reduce((all, fields) => all.filter(field => fields.includes(field)), this.inputFieldOptions(this.jobForm.inputs[0])) },
    isTrainingTemplate() { return /^hfl-|^vfl-/.test(this.jobForm.templateId) },
    hasEditablePolicy() { return ['private-stats-3p-v1', 'psi-2p-v1', 'psi-3p-v1', 'he-paillier-2p-v1'].includes(this.jobForm.templateId) || this.isTrainingTemplate },
    canPreflight() { return Boolean(this.selectedTemplate && this.jobForm.inputs.length === this.templateSlots(this.selectedTemplate).length && this.jobForm.inputs.every(input => input.datasetId && input.datasetVersion && input.fields.length && input.domainId) && !this.domainConflict) },
    canCreate() { return Boolean(this.canPreflight && this.preflight && this.preflight.valid !== false && this.preflightSpecJson === JSON.stringify(this.buildJobSpec())) },
    jobInputs() { if (!this.selectedJob) return []; return listOf(this.selectedJob.inputSnapshots || this.selectedJob.inputs || this.selectedJob.participants) },
    approvalMode() { return Boolean(this.selectedApproval && this.selectedJob && this.selectedJob.status === 'AWAITING_APPROVAL') },
    canReadResult() { const id = this.selectedJob && (this.selectedJob.initiatorUserId || (this.selectedJob.initiator && this.selectedJob.initiator.id)); return Boolean(this.isDataOwner && !this.roles.includes('ADMIN') && !this.isAuditor && this.selectedJob && this.selectedJob.status === 'SUCCEEDED' && String(id) === String(this.$store.getters.userId)) },
    canCancel() { return Boolean(this.selectedJob && !TERMINAL.includes(this.selectedJob.status) && String(this.selectedJob.initiatorUserId || '') === String(this.$store.getters.userId)) },
    canRetry() { return Boolean(this.selectedJob && ['FAILED', 'ABORTED'].includes(this.selectedJob.status) && String(this.selectedJob.initiatorUserId || '') === String(this.$store.getters.userId)) }
  },
  watch: { '$route.meta.privacyTab'(value) { if (value) { this.activeTab = value; this.refreshActive() } } },
  created() { this.loadCatalog(); if (this.activeTab === 'create') this.loadDatasets(); if (this.activeTab === 'approvals') this.loadPendingApprovals(); if (this.activeTab === 'jobs') this.loadJobs(); const id = this.$route.params && this.$route.params.jobId; if (id) this.openJob({ jobId: id }) },
  methods: {
    arrayValue(value) { return Array.isArray(value) ? value : [] }, prettyJson(value) { return JSON.stringify(value, null, 2) },
    securityText(value) { return ({ MALICIOUS_3PC: '恶意安全 3PC', MALICIOUS_3PC_HONEST_MAJORITY: '诚实多数恶意安全 3PC', SEMI_HONEST: '半诚实', ADDITIVE_HE: '加法同态', RESERVED: '预留' })[value] || value || '未声明' },
    availabilityText(value) { return ({ AVAILABLE: '可用', EXPERIMENTAL: '实验', RESERVED: '预留', UNAVAILABLE: '不可用' })[value] || value || '未知' }, availabilityTag(value) { return value === 'AVAILABLE' ? 'success' : value === 'EXPERIMENTAL' ? 'warning' : 'info' },
    roleText(value) { return ({ RECEIVER: '结果接收方', PROVIDER: '数据提供方', PARTY: '计算参与方', QUERY: '查询方', SERVER: '服务方', LABEL_OWNER: '标签持有方', FEATURE_OWNER: '特征持有方' })[value] || value || '参与方' },
    statusText(value) { return ({ AWAITING_APPROVAL: '等待审批', QUEUED: '排队中', PREPARING: '准备中', RUNNING: '运行中', FINALIZING: '收尾中', SUCCEEDED: '已完成', FAILED: '基础设施失败', ABORTED: '已中止', CANCELLED: '已取消' })[value] || value }, statusTag(value) { return value === 'SUCCEEDED' ? 'success' : ['FAILED', 'ABORTED'].includes(value) ? 'danger' : value === 'AWAITING_APPROVAL' ? 'warning' : 'primary' },
    approvalState(input) { const decision = input.decision || input.approvalStatus; if (decision) return decision; const id = input.ownerUserId || input.userId; const approval = listOf(this.selectedJob && this.selectedJob.approvals).find(item => String(item.userId || item.approverUserId) === String(id)); return approval ? approval.decision : 'PENDING' }, approvalText(value) { return ({ APPROVED: '已同意', REJECTED: '已拒绝', PENDING: '待审批', AUTO_APPROVED: '发起者自动同意' })[value] || value }, approvalTag(value) { return value === 'APPROVED' || value === 'AUTO_APPROVED' ? 'success' : value === 'REJECTED' ? 'danger' : 'warning' },
    formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—' }, templateName(id) { const item = this.templates.find(template => template.templateId === id); return item ? item.displayName || id : id },
    templateSlots(template) { if (Array.isArray(template && template.participantSlots) && template.participantSlots.length) return template.participantSlots; const count = Number(template && template.participantCount) || 0; return Array.from({ length: count }, (_, index) => ({ slotId: `P${index}`, role: index === 0 ? 'RECEIVER' : 'PROVIDER', label: index === 0 ? '结果接收方' : `数据提供方 ${index}` })) },
    datasetDomainId(dataset) { return dataset.ownerDomainId || (dataset.ownerDomain && (dataset.ownerDomain.id || dataset.ownerDomain.domainId)) }, datasetDomainName(dataset) { return dataset.ownerDomainName || (dataset.ownerDomain && dataset.ownerDomain.name) || '未分配域' }, datasetOwnerName(dataset) { return dataset.ownerDisplayName || dataset.ownerUsername || (dataset.ownerUser && (dataset.ownerUser.displayName || dataset.ownerUser.username)) || '未分配持有者' },
    datasetFields(dataset) { const schema = dataset && dataset.schema; if (!schema) return []; if (Array.isArray(schema)) return schema.map(item => typeof item === 'string' ? item : item.name).filter(Boolean); const fields = []; if (Array.isArray(schema.columns)) schema.columns.forEach(item => fields.push(typeof item === 'string' ? item : item.name)); if (schema.properties) fields.push(...Object.keys(schema.properties)); return [...new Set(fields.filter(Boolean))].sort() },
    datasetDigest(dataset) { if (dataset.authoritativeSha256) return dataset.authoritativeSha256; const replica = (dataset.replicas || []).find(item => item.effectiveAvailability === 'USABLE' && item.checksumAlgorithm === 'SHA-256'); return replica ? replica.checksum : '' }, inputFieldOptions(input) { return this.datasetFields(this.datasets.find(item => String(item.datasetId) === String(input.datasetId))) },
    defaultEnginePolicy(id) { if (id === 'private-stats-3p-v1') return { scale: 1000 }; if (id === 'private-threshold-3p-v1') return { programId: 'topic4_private_threshold_100', threshold: 100, scale: 1 }; if (id.indexOf('psi-') === 0) return { keyColumns: ['id'], outputMode: 'RECEIVER_ONLY' }; if (id === 'pir-keyword-2p-v1') return { queryColumn: 'query', valueColumns: ['value'] }; if (id === 'he-paillier-2p-v1') return { operation: 'ADD', scale: 1000 }; if (id === 'hfl-fedavg-logreg-3p-v1') return { labelColumn: 'label', featureColumns: ['x1', 'x2'], epochs: 1, learningRate: 0.05, seed: 20260919 }; if (id === 'vfl-secureboost-2p-v1') return { labelColumn: 'label', featureColumns: ['x2', 'x1'], epochs: 1, learningRate: 0.1, seed: 20260919 }; return {} },
    applyTemplate(id) { const template = this.templates.find(item => item.templateId === id); const defaults = DEFAULT_FIELDS[id] || []; this.jobForm.inputs = this.templateSlots(template).map((slot, index) => ({ slotId: slot.slotId, role: slot.role, label: slot.label, datasetId: null, datasetVersion: '', fields: defaults[index] || [], ownerName: '', domainId: null, domainName: '', displaySha256: '' })); this.jobForm.timeoutSeconds = Math.min(template.maxTimeoutSeconds || 1800, /^hfl-|^vfl-/.test(id) ? 3600 : 1800); this.jobForm.enginePolicy = this.defaultEnginePolicy(id); this.invalidatePreflight() },
    syncInputDataset(input) { const dataset = this.datasets.find(item => String(item.datasetId) === String(input.datasetId)); if (!dataset) return; input.datasetVersion = dataset.version; input.ownerName = this.datasetOwnerName(dataset); input.domainId = this.datasetDomainId(dataset); input.domainName = this.datasetDomainName(dataset); input.displaySha256 = this.datasetDigest(dataset); input.fields = input.fields.filter(field => this.datasetFields(dataset).includes(field)); if (!input.fields.length) input.fields = (DEFAULT_FIELDS[this.jobForm.templateId] || [])[this.jobForm.inputs.indexOf(input)] || []; input.fields = input.fields.filter(field => this.datasetFields(dataset).includes(field)); this.invalidatePreflight() },
    buildJobSpec() { return { templateId: this.jobForm.templateId, inputs: this.jobForm.inputs.map(input => ({ slotId: input.slotId, datasetId: input.datasetId, datasetVersion: input.datasetVersion, fields: [...input.fields] })), timeoutSeconds: this.jobForm.timeoutSeconds, enginePolicy: { ...this.jobForm.enginePolicy }} }, invalidatePreflight() { this.preflight = null; this.preflightSpecJson = ''; this.formError = '' },
    async loadCatalog() { this.catalogLoading = true; try { const [capabilities, templates] = await Promise.all([fetchPrivacyCapabilities(), fetchPrivacyTemplates()]); this.capabilities = listOf(capabilities); this.templates = listOf(templates); if (this.jobForm.templateId && !this.selectedTemplate) this.jobForm.templateId = '' } catch (error) { this.$message.error(`能力清单加载失败：${error.message}`) } finally { this.catalogLoading = false } },
    async loadDatasets() { try { this.datasets = await fetchAllPages(fetchRegisteredDatasets, {}, { status: 'ACTIVE' }) } catch (error) { this.$message.error(`数据目录加载失败：${error.message}`) } },
    async runPreflight() { if (!this.canPreflight) return; this.preflightLoading = true; const spec = this.buildJobSpec(); try { this.preflight = await preflightPrivacyJob(spec); this.preflightSpecJson = JSON.stringify(spec); if (this.preflight.valid === false) this.formError = listOf(this.preflight.errors).join('；') || '预检未通过' } catch (error) { this.formError = `预检失败：${error.message}` } finally { this.preflightLoading = false } },
    async createJob() { if (!this.canCreate) return; this.creating = true; try { const created = await createPrivacyJob(this.buildJobSpec(), privacyRequestId()); this.$message.success('任务已创建，正在等待数据持有者审批'); this.activeTab = 'jobs'; await this.loadJobs(); const job = created.job || created; if (job.jobId) await this.openJob(job) } catch (error) { this.formError = `任务创建失败：${error.message}` } finally { this.creating = false } },
    async loadPendingApprovals(options = {}) { if (!this.isDataOwner) return; if (!options.silent) this.approvalsLoading = true; try { this.pendingApprovals = listOf(await fetchPendingPrivacyApprovals({}, options)) } catch (error) { if (!options.silent) this.$message.error(`待审批任务加载失败：${error.message}`) } finally { if (!options.silent) this.approvalsLoading = false } },
    async loadJobs(options = {}) { if (!options.silent) this.jobsLoading = true; try { this.jobs = listOf(await fetchPrivacyJobs({ status: this.statusFilter || undefined, limit: 100 }, options)) } catch (error) { if (!options.silent) this.$message.error(`任务列表加载失败：${error.message}`) } finally { if (!options.silent) this.jobsLoading = false } },
    jobOf(item) { return item.job || item }, jobIdOf(item) { return this.jobOf(item).jobId }, initiatorName(job) { return job.initiatorDisplayName || job.initiatorUsername || (typeof job.initiator === 'string' ? job.initiator : job.initiator && (job.initiator.displayName || job.initiator.username)) || '—' }, approvalDatasetName(item) { const direct = item.datasetName || (item.inputSnapshot && item.inputSnapshot.datasetName); if (direct) return direct; const participants = listOf(this.jobOf(item).participants); const owned = participants.find(input => String(input.ownerUserId) === String(this.$store.getters.userId)); const datasetId = item.datasetId || (item.inputSnapshot && item.inputSnapshot.datasetId) || (owned && owned.datasetId); return `数据集 #${datasetId || '—'}` },
    async openApproval(item) { this.selectedApproval = item; await this.openJob(this.jobOf(item), true) },
    async openJob(row, preserveApproval = false) { if (!row || !row.jobId) return; if (!preserveApproval) this.selectedApproval = null; this.detailVisible = true; this.detailLoading = true; this.artifactData = null; try { const [job, events] = await Promise.all([fetchPrivacyJob(row.jobId), fetchPrivacyJobEvents(row.jobId)]); this.selectedJob = job; this.events = listOf(events) } catch (error) { this.$message.error(`任务详情加载失败：${error.message}`) } finally { this.detailLoading = false } },
    async decide(action) { if (!this.selectedJob) return; this.actionLoading = action; try { if (action === 'approve') await approvePrivacyJob(this.selectedJob.jobId, this.decisionReason.trim()); else await rejectPrivacyJob(this.selectedJob.jobId, this.decisionReason.trim()); this.$message.success(action === 'approve' ? '已同意数据授权' : '已拒绝任务'); this.detailVisible = false; this.selectedApproval = null; this.decisionReason = ''; await Promise.all([this.loadPendingApprovals({ silent: true }), this.loadJobs({ silent: true })]) } catch (error) { this.$message.error(`审批失败：${error.message}`) } finally { this.actionLoading = '' } },
    async cancelSelectedJob() { try { await this.$confirm('确认取消当前任务？', '取消任务', { type: 'warning' }); await cancelPrivacyJob(this.selectedJob.jobId, '由发起者取消'); this.$message.success('取消请求已提交'); await this.openJob(this.selectedJob) } catch (error) { if (error !== 'cancel') this.$message.error(`取消失败：${error.message}`) } },
    async retrySelectedJob() { try { await retryPrivacyJob(this.selectedJob.jobId, privacyRequestId()); this.$message.success('已创建新的尝试，需重新审批'); await this.openJob(this.selectedJob) } catch (error) { this.$message.error(`重试失败：${error.message}`) } },
    async loadArtifact(kind, download) { try { const data = kind === 'result' ? await fetchPrivacyJobResult(this.selectedJob.jobId) : await fetchPrivacyJobEvidence(this.selectedJob.jobId); this.artifactData = data; if (download) this.downloadJson(data, `${this.selectedJob.jobId}-${kind}.json`) } catch (error) { this.$message.error(`${kind === 'result' ? '结果' : '证据'}读取失败：${error.message}`) } },
    downloadJson(data, name) { const url = URL.createObjectURL(new Blob([this.prettyJson(data)], { type: 'application/json;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) },
    onTabClick() { const path = { capabilities: '/collaboration/capabilities', create: '/collaboration/jobs/new', approvals: '/collaboration/approvals', jobs: '/collaboration/jobs' }[this.activeTab]; if (path && this.$route.path !== path) this.$router.push(path) },
    async refreshActive() { this.loading = true; try { if (this.activeTab === 'capabilities') await this.loadCatalog(); else if (this.activeTab === 'create') await Promise.all([this.loadCatalog(), this.loadDatasets()]); else if (this.activeTab === 'approvals') await this.loadPendingApprovals(); else await this.loadJobs() } finally { this.loading = false } }
  }
}
</script>

<style scoped>
.privacy-page{min-height:calc(100vh - 90px);background:#f4f7fa}.page-heading,.section-heading,.detail-title,.jobs-toolbar,.form-actions,.decision-panel{display:flex;align-items:center;justify-content:space-between;gap:14px}.page-heading{margin-bottom:16px}.page-heading h2{margin:0 0 7px;color:#1f3447}.page-heading p,.muted{margin:0;color:#7b8995;font-size:13px}.workspace-card{margin-top:16px;padding:8px 22px 24px;border-radius:8px;background:#fff;box-shadow:0 2px 9px rgba(32,55,76,.06)}.section-heading{margin:8px 0 14px}.section-heading h3{display:inline;margin:0 12px 0 0;color:#263b4d}.section-heading span{color:#84919c;font-size:13px}.spaced{margin-top:26px}.tag{margin:2px 4px 2px 0}.mono{font-family:monospace;overflow-wrap:anywhere}.job-form{margin-top:10px}.slot-card{min-height:390px;margin-bottom:14px;padding:16px;border:1px solid #dfe7ed;border-radius:7px;background:#fbfcfd}.slot-title{display:flex;align-items:center;margin-bottom:14px}.slot-badge{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:30px;margin-right:9px;padding:0 6px;border-radius:15px;color:#fff;background:#3b7ca7;font-weight:700}.snapshot{margin:-4px 0 14px;padding:10px 12px;border-radius:5px;background:#eef4f8;color:#405769;font-size:13px}.snapshot div{display:flex;margin:5px 0}.snapshot span{width:58px;color:#83919d}.snapshot code{max-width:calc(100% - 58px);overflow-wrap:anywhere}.option-owner{float:right;color:#84919c;font-size:12px}.policy-card{margin:8px 0 18px;padding:15px 16px 3px;border:1px solid #dfe7ed;border-radius:7px;background:#f8fafc}.feedback,.form-actions,.list-table{margin-top:16px}.jobs-toolbar{justify-content:flex-start;margin:7px 0 15px}.link{color:#28789f;cursor:pointer}.detail-body{padding:0 24px 30px}.detail-title h3{margin:0 0 6px;font-family:monospace}.detail-body h4{margin:22px 0 10px;color:#344a5b}.decision-panel{align-items:flex-end;margin-top:18px;padding:16px;border:1px solid #ead8a8;border-radius:6px;background:#fffaf0}.decision-panel .el-textarea{flex:1}.detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.detail-actions .el-button+.el-button{margin-left:0}.artifact{max-height:360px;padding:14px;overflow:auto;border-radius:5px;color:#d9e4ec;background:#263640;font-size:12px;white-space:pre-wrap}.el-timeline{padding-left:5px}@media(max-width:768px){.page-heading,.section-heading,.detail-title,.jobs-toolbar,.form-actions,.decision-panel{align-items:stretch;flex-direction:column}}
</style>
