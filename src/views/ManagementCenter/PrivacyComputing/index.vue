<template>
  <el-container class="privacy-page">
    <el-main>
      <section class="page-heading">
        <div>
          <h2>隐私协同计算</h2>
          <p>在 A/B/C 三个逻辑域之间运行固定协议模板，并保留任务、结果和证据原文供人工 judge。</p>
        </div>
        <router-link to="/ManagementCenter/SecurityValidation">
          <el-button icon="el-icon-back">旧安全验收页</el-button>
        </router-link>
      </section>

      <el-alert
        title="当前是单 Kubernetes 集群演示：提供协议功能和逻辑域隔离，不声明能够抵御集群管理员。系统不会自动判定验收通过。"
        type="warning"
        :closable="false"
        show-icon
      />

      <section class="auth-card">
        <div class="auth-copy">
          <h3>参与方单次认证</h3>
          <p>凭据只保存在当前页面内存中，每个受保护请求单独发送 HTTP Basic；不会写入 storage、Vuex、URL、任务或下载文件。</p>
        </div>
        <el-row :gutter="12" class="secret-row">
          <el-col v-for="party in ['A', 'B', 'C']" :key="party" :xs="24" :sm="8">
            <el-input
              v-model="partySecrets[party]"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="`参与方 ${party} secret`"
              @input="onSecretChange(party)"
            ><template slot="prepend">{{ party }}</template></el-input>
          </el-col>
        </el-row>
      </section>

      <el-tabs v-model="activeTab" class="workspace-card">
        <el-tab-pane label="能力与模板" name="capabilities">
          <div class="section-heading">
            <div><h3>执行引擎</h3><span>版本、安全档位和可用状态均来自后端能力注册表</span></div>
            <el-button size="small" :loading="catalogLoading" @click="loadCatalog">刷新能力</el-button>
          </div>
          <el-alert title="MP-SPDZ 仅作为协议功能验收后端，并非生产安全认证产品；恶意安全模板的准确档位是诚实多数三方恶意安全。" type="warning" :closable="false" show-icon class="engine-warning" />
          <el-table v-loading="catalogLoading" :data="capabilities" border size="small" empty-text="后端未返回执行引擎">
            <el-table-column prop="displayName" label="引擎" min-width="150">
              <template slot-scope="s"><strong>{{ s.row.displayName || s.row.provider }}</strong><div class="cell-note">{{ s.row.provider }}</div></template>
            </el-table-column>
            <el-table-column label="状态" width="118">
              <template slot-scope="s"><el-tag size="mini" :type="availabilityTag(s.row.status)">{{ availabilityText(s.row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="version" label="版本" min-width="120" />
            <el-table-column label="安全档位" min-width="190">
              <template slot-scope="s"><el-tag v-for="profile in arrayValue(s.row.securityProfiles)" :key="profile" size="mini" class="inline-tag" effect="plain">{{ securityText(profile) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="能力" min-width="240">
              <template slot-scope="s"><span v-if="!arrayValue(s.row.operations).length">—</span><el-tag v-for="operation in arrayValue(s.row.operations)" :key="operation" size="mini" class="inline-tag" type="info">{{ operation }}</el-tag></template>
            </el-table-column>
            <el-table-column label="构建信息" min-width="210">
              <template slot-scope="s"><span class="digest">{{ s.row.imageDigest || '未配置镜像摘要' }}</span><el-tag v-if="s.row.experimental" size="mini" type="warning" class="experimental">实验组件</el-tag></template>
            </el-table-column>
            <el-table-column prop="reason" label="不可用原因" min-width="190" show-overflow-tooltip />
          </el-table>

          <div class="section-heading template-heading"><div><h3>固定任务模板</h3><span>模板锁定 Provider 和安全档位，禁止自动降级</span></div></div>
          <el-table :data="templates" border size="small" empty-text="后端未返回任务模板">
            <el-table-column prop="displayName" label="模板" min-width="190">
              <template slot-scope="s"><strong>{{ s.row.displayName || s.row.templateId }}</strong><div class="cell-note">{{ s.row.templateId }}</div></template>
            </el-table-column>
            <el-table-column prop="operation" label="操作" width="150" />
            <el-table-column prop="provider" label="Provider" min-width="150" />
            <el-table-column label="安全档位" min-width="150"><template slot-scope="s"><el-tag size="mini" :type="securityTag(s.row.securityProfile)">{{ securityText(s.row.securityProfile) }}</el-tag></template></el-table-column>
            <el-table-column prop="participantCount" label="参与方" width="75" align="center" />
            <el-table-column label="状态" width="145"><template slot-scope="s"><el-tag size="mini" :type="s.row.available ? 'success' : 'danger'">{{ s.row.available ? '可用' : '不可用' }}</el-tag><el-tag v-if="s.row.experimental" size="mini" type="warning" class="inline-tag">实验</el-tag></template></el-table-column>
            <el-table-column label="输出" min-width="185"><template slot-scope="s"><span>{{ arrayValue(s.row.supportedResults).join('、') || '—' }}</span></template></el-table-column>
            <el-table-column prop="leakageDisclosure" label="泄露说明" min-width="280" show-overflow-tooltip />
            <el-table-column prop="unavailableReason" label="限制" min-width="180" show-overflow-tooltip />
          </el-table>

          <div class="section-heading template-heading"><div><h3>明确不提供</h3><span>能力边界会随证据一起展示，不以相近协议冒充</span></div></div>
          <el-row :gutter="12">
            <el-col v-for="item in declaredLimits" :key="item.name" :xs="24" :sm="12" :lg="8">
              <div class="limit-card"><el-tag size="mini" type="danger">UNAVAILABLE</el-tag><strong>{{ item.name }}</strong><p>{{ item.reason }}</p></div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="创建任务" name="create">
          <el-form label-position="top" class="job-form">
            <el-row :gutter="18">
              <el-col :xs="24" :md="14">
                <el-form-item label="任务模板" required>
                  <el-select v-model="jobForm.templateId" filterable style="width:100%" placeholder="选择固定模板" @change="applyTemplate">
                    <el-option v-for="item in templates" :key="item.templateId" :value="item.templateId" :label="`${item.displayName || item.templateId} · ${securityText(item.securityProfile)}`" :disabled="!item.available" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="12" :md="5"><el-form-item label="超时（秒）"><el-input-number v-model="jobForm.timeoutSeconds" :min="60" :max="selectedTemplate ? selectedTemplate.maxTimeoutSeconds : 3600" :step="60" controls-position="right" style="width:100%" @change="invalidatePreflight" /></el-form-item></el-col>
              <el-col :xs="12" :md="5">
                <el-form-item label="发起方" required>
                  <el-select v-model="createPrincipal" style="width:100%" @change="onCreatePrincipalChange">
                    <el-option v-for="party in participantIds" :key="party" :label="`参与方 ${party}`" :value="party" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-alert
              v-if="selectedTemplate"
              :title="selectedTemplate.leakageDisclosure || '该模板未提供额外泄露说明'"
              :description="`${selectedTemplate.provider} · ${securityText(selectedTemplate.securityProfile)}${selectedTemplate.experimental ? ' · 实验组件' : ''}`"
              :type="selectedTemplate.experimental ? 'warning' : 'info'"
              :closable="false"
              show-icon
            />

            <div class="section-heading participant-heading"><div><h3>参与方数据绑定</h3><span>任务创建时冻结数据版本、SHA-256 和字段清单</span></div></div>
            <el-row :gutter="14">
              <el-col v-for="participant in jobForm.participants" :key="participant.partyId" :xs="24" :lg="8">
                <div class="party-card">
                  <div class="party-title"><span class="party-badge">{{ participant.partyId }}</span><strong>{{ roleText(participant.role) }}</strong></div>
                  <el-form-item label="数据集" required>
                    <el-select v-model="participant.datasetId" filterable style="width:100%" placeholder="选择 ACTIVE 数据集" @change="syncParticipantDataset(participant)">
                      <el-option v-for="dataset in datasets" :key="dataset.datasetId" :value="dataset.datasetId" :label="`${dataset.name || dataset.datasetCode} #${dataset.datasetId} · ${dataset.version}`" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="数据版本"><el-input :value="participant.datasetVersion || '选择数据集后冻结'" disabled /></el-form-item>
                  <el-form-item label="权威 / USABLE SHA-256"><el-input :value="participant.displaySha256 || '目录无权威摘要且没有 USABLE 副本摘要'" disabled class="digest-input" /></el-form-item>
                  <el-form-item label="字段绑定" required>
                    <el-select v-model="participant.fields" multiple filterable style="width:100%" :disabled="!participantFieldOptions(participant).length" placeholder="从冻结 schema 选择字段" @change="onFieldBindingChange">
                      <el-option v-for="field in participantFieldOptions(participant)" :key="field" :label="field" :value="field" />
                    </el-select>
                    <span v-if="participant.datasetId && !participantFieldOptions(participant).length" class="field-warning">该数据集没有可用的冻结 schema 字段</span>
                  </el-form-item>
                </div>
              </el-col>
            </el-row>

            <div v-if="selectedTemplate" class="policy-card">
              <div class="section-heading"><div><h3>模板执行策略</h3><span>只提交当前模板白名单中的参数</span></div></div>
              <el-alert v-if="jobForm.templateId === 'secure-sum-3p-v1'" title="安全求和模板没有可调引擎参数。" type="info" :closable="false" show-icon />
              <el-row v-else :gutter="16">
                <template v-if="jobForm.templateId === 'private-stats-3p-v1'">
                  <el-col :xs="24" :sm="8"><el-form-item label="定点数 scale"><el-input-number v-model="jobForm.enginePolicy.scale" :min="1" :max="1000000" controls-position="right" style="width:100%" @change="onPolicyChange" /></el-form-item></el-col>
                </template>
                <template v-else-if="jobForm.templateId === 'private-threshold-3p-v1'">
                  <el-col :xs="24" :sm="10"><el-form-item label="预注册 programId"><el-input v-model="jobForm.enginePolicy.programId" disabled /></el-form-item></el-col>
                  <el-col :xs="12" :sm="7"><el-form-item label="固定阈值"><el-input-number v-model="jobForm.enginePolicy.threshold" disabled style="width:100%" /></el-form-item></el-col>
                  <el-col :xs="12" :sm="7"><el-form-item label="定点数 scale"><el-input-number v-model="jobForm.enginePolicy.scale" :min="1" :max="1000000" controls-position="right" style="width:100%" @change="onPolicyChange" /></el-form-item></el-col>
                </template>
                <template v-else-if="jobForm.templateId === 'psi-2p-v1' || jobForm.templateId === 'psi-3p-v1'">
                  <el-col :xs="24" :sm="14"><el-form-item label="求交键 keyColumns"><el-select v-model="jobForm.enginePolicy.keyColumns" multiple filterable style="width:100%" @change="onPolicyChange"><el-option v-for="field in psiKeyOptions" :key="field" :label="field" :value="field" /></el-select></el-form-item></el-col>
                  <el-col :xs="24" :sm="10"><el-form-item label="输出模式 outputMode"><el-select v-model="jobForm.enginePolicy.outputMode" style="width:100%" @change="onOutputModeChange"><el-option label="仅接收方 A" value="RECEIVER_ONLY" /><el-option label="全部参与方" value="ALL_PARTIES" /></el-select></el-form-item></el-col>
                </template>
                <template v-else-if="jobForm.templateId === 'pir-keyword-2p-v1'">
                  <el-col :xs="24" :sm="10"><el-form-item label="查询列 queryColumn"><el-select v-model="jobForm.enginePolicy.queryColumn" style="width:100%" @change="onPolicyChange"><el-option v-for="field in (jobForm.participants[0] ? jobForm.participants[0].fields : [])" :key="field" :label="field" :value="field" /></el-select></el-form-item></el-col>
                  <el-col :xs="24" :sm="14"><el-form-item label="返回列 valueColumns"><el-select v-model="jobForm.enginePolicy.valueColumns" multiple style="width:100%" @change="onPolicyChange"><el-option v-for="field in (jobForm.participants[1] ? jobForm.participants[1].fields : [])" :key="field" :label="field" :value="field" /></el-select></el-form-item></el-col>
                </template>
                <template v-else-if="jobForm.templateId === 'he-paillier-2p-v1'">
                  <el-col :xs="24" :sm="14"><el-form-item label="同态操作 operation"><el-select v-model="jobForm.enginePolicy.operation" style="width:100%" @change="onPolicyChange"><el-option label="密文加法" value="ADD" /><el-option label="明文乘法" value="PLAINTEXT_MULTIPLY" /><el-option label="点积" value="DOT_PRODUCT" /></el-select></el-form-item></el-col>
                  <el-col :xs="24" :sm="10"><el-form-item label="定点数 scale"><el-input-number v-model="jobForm.enginePolicy.scale" :min="1" :max="1000000" controls-position="right" style="width:100%" @change="onPolicyChange" /></el-form-item></el-col>
                </template>
                <template v-else-if="isFederatedTemplate">
                  <el-col :xs="24" :sm="8"><el-form-item label="标签列 labelColumn"><el-select v-model="jobForm.enginePolicy.labelColumn" style="width:100%" @change="onPolicyChange"><el-option v-for="field in policyFieldOptions" :key="field" :label="field" :value="field" /></el-select></el-form-item></el-col>
                  <el-col :xs="24" :sm="16"><el-form-item label="特征列 featureColumns"><el-select v-model="jobForm.enginePolicy.featureColumns" multiple filterable style="width:100%" @change="onPolicyChange"><el-option v-for="field in policyFieldOptions" :key="field" :label="field" :value="field" /></el-select></el-form-item></el-col>
                  <el-col :xs="12" :sm="8"><el-form-item label="轮数 epochs"><el-input-number v-model="jobForm.enginePolicy.epochs" :min="1" :max="1000" controls-position="right" style="width:100%" @change="onPolicyChange" /></el-form-item></el-col>
                  <el-col :xs="12" :sm="8"><el-form-item label="学习率 learningRate"><el-input-number v-model="jobForm.enginePolicy.learningRate" :min="0.000001" :max="10" :step="0.01" controls-position="right" style="width:100%" @change="onPolicyChange" /></el-form-item></el-col>
                  <el-col :xs="24" :sm="8"><el-form-item label="随机种子 seed"><el-input-number v-model="jobForm.enginePolicy.seed" :min="0" :max="2147483647" controls-position="right" style="width:100%" @change="onPolicyChange" /></el-form-item></el-col>
                </template>
              </el-row>
            </div>

            <el-row :gutter="18" class="policy-row">
              <el-col :xs="24" :md="12">
                <el-form-item label="结果接收方（由模板和输出模式约束）" required>
                  <el-checkbox-group v-model="jobForm.resultRecipients" disabled>
                    <el-checkbox v-for="party in participantIds" :key="party" :label="party">参与方 {{ party }}</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="认证发起方"><el-input :value="`${createPrincipal}（预检和创建均使用该方的单次 Basic 凭据）`" disabled /></el-form-item>
              </el-col>
            </el-row>

            <div class="form-actions">
              <el-button type="primary" plain :loading="preflightLoading" :disabled="!canPreflight" @click="runPreflight">执行预检</el-button>
              <el-button type="primary" :loading="creating" :disabled="!canCreate" @click="createJob">创建任务</el-button>
              <span v-if="preflight" class="spec-digest">JobSpec 摘要：{{ preflight.specDigest || '—' }}</span>
            </div>
          </el-form>

          <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon class="feedback" />
          <div v-if="preflight" class="preflight-panel">
            <el-alert :title="preflight.valid ? '预检校验完成，可以创建任务' : '预检发现待修正项'" :type="preflight.valid ? 'success' : 'error'" :closable="false" show-icon />
            <ul v-if="arrayValue(preflight.errors).length" class="issue-list error-list"><li v-for="item in arrayValue(preflight.errors)" :key="issueKey(item)">{{ issueText(item) }}</li></ul>
            <ul v-if="arrayValue(preflight.warnings).length" class="issue-list warning-list"><li v-for="item in arrayValue(preflight.warnings)" :key="issueKey(item)">{{ issueText(item) }}</li></ul>
          </div>
        </el-tab-pane>

        <el-tab-pane label="任务与证据" name="jobs">
          <div class="jobs-toolbar">
            <el-select v-model="actionPrincipal" size="small" class="principal-select" placeholder="当前认证方" @change="onActionPrincipalChange">
              <el-option v-for="party in ['A', 'B', 'C']" :key="party" :label="`当前认证方 ${party}`" :value="party" />
            </el-select>
            <el-select v-model="statusFilter" clearable size="small" placeholder="全部状态" @change="loadJobs">
              <el-option v-for="status in statuses" :key="status" :label="statusText(status)" :value="status" />
            </el-select>
            <el-button size="small" icon="el-icon-refresh" :loading="jobsLoading" @click="refreshJobs">刷新</el-button>
            <span>任务运行只输出原始状态、结果与证据，最终结论由人工给出。</span>
          </div>
          <el-row :gutter="16">
            <el-col :xs="24" :xl="10">
              <el-table v-loading="jobsLoading" :data="jobs" border size="small" highlight-current-row empty-text="尚无隐私计算任务" @row-click="openJob">
                <el-table-column prop="jobId" label="任务 ID" min-width="150" show-overflow-tooltip />
                <el-table-column prop="templateId" label="模板" min-width="165" show-overflow-tooltip />
                <el-table-column label="状态" width="115"><template slot-scope="s"><el-tag size="mini" :type="statusTag(s.row.status)">{{ statusText(s.row.status) }}</el-tag></template></el-table-column>
                <el-table-column prop="attemptId" label="尝试" min-width="110" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="创建时间" min-width="160" />
              </el-table>
            </el-col>
            <el-col :xs="24" :xl="14">
              <div v-if="selectedJob" v-loading="detailLoading" class="job-detail">
                <div class="detail-title">
                  <div><h3>{{ selectedJob.jobId }}</h3><span>{{ selectedJob.templateId }} · {{ selectedJob.provider }}</span></div>
                  <el-tag :type="statusTag(selectedJob.status)">{{ statusText(selectedJob.status) }}</el-tag>
                </div>
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item label="安全档位">{{ securityText(selectedJob.securityProfile) }}</el-descriptions-item>
                  <el-descriptions-item label="尝试 ID">{{ selectedJob.attemptId }}</el-descriptions-item>
                  <el-descriptions-item label="协议版本">{{ selectedJob.protocolVersion || '—' }}</el-descriptions-item>
                  <el-descriptions-item label="超时">{{ selectedJob.timeoutSeconds }} 秒</el-descriptions-item>
                  <el-descriptions-item label="JobSpec 摘要"><span class="digest">{{ selectedJob.specDigest || '—' }}</span></el-descriptions-item>
                  <el-descriptions-item label="镜像摘要"><span class="digest">{{ selectedJob.imageDigest || '—' }}</span></el-descriptions-item>
                  <el-descriptions-item label="失败原因" :span="2">{{ failureText(selectedJob) }}</el-descriptions-item>
                </el-descriptions>

                <div class="detail-actions">
                  <el-button v-if="canCancelSelected" size="small" type="danger" plain :loading="actionLoading === 'cancel'" @click="cancelSelectedJob">取消任务</el-button>
                  <el-button v-if="canRetrySelected" size="small" type="warning" plain :loading="actionLoading === 'retry'" @click="retrySelectedJob">新尝试重试</el-button>
                  <el-select v-model="artifactPrincipal" size="small" class="principal-select" placeholder="读取身份" @change="clearArtifactData">
                    <el-option v-for="party in participantIdsForJob" :key="party" :label="`读取身份 ${party}`" :value="party" />
                  </el-select>
                  <el-button size="small" :disabled="!canReadResult" @click="loadArtifact('result', false)">查看结果</el-button>
                  <el-button size="small" :disabled="!canReadResult" @click="loadArtifact('result', true)">下载结果</el-button>
                  <el-button size="small" :disabled="!canReadEvidence" @click="loadArtifact('evidence', false)">查看证据</el-button>
                  <el-button size="small" :disabled="!canReadEvidence" @click="loadArtifact('evidence', true)">下载证据</el-button>
                </div>

                <div class="approval-heading"><h4>参与方审批</h4><el-input v-model.trim="decisionReason" size="small" placeholder="审批理由；拒绝时必填" /></div>
                <el-table :data="jobParticipants" border size="mini" empty-text="任务未返回参与方">
                  <el-table-column prop="partyId" label="参与方" width="70" />
                  <el-table-column prop="role" label="角色" min-width="120"><template slot-scope="s">{{ roleText(s.row.role) }}</template></el-table-column>
                  <el-table-column label="数据" min-width="155"><template slot-scope="s">#{{ s.row.datasetId }} @ {{ s.row.datasetVersion }}</template></el-table-column>
                  <el-table-column label="审批" width="110"><template slot-scope="s"><el-tag size="mini" :type="decisionTag(approvalState(s.row))">{{ approvalState(s.row) }}</el-tag></template></el-table-column>
                  <el-table-column label="操作" width="145"><template slot-scope="s"><el-button type="text" :disabled="!canDecide(s.row)" :loading="actionLoading === `approve-${s.row.partyId}`" @click="decideParticipant('approve', s.row)">批准</el-button><el-button type="text" class="danger-text" :disabled="!canDecide(s.row)" :loading="actionLoading === `reject-${s.row.partyId}`" @click="decideParticipant('reject', s.row)">拒绝</el-button></template></el-table-column>
                </el-table>

                <h4>事件时间线</h4>
                <el-table :data="events" border size="mini" max-height="330" empty-text="暂无事件">
                  <el-table-column prop="createdAt" label="时间" min-width="160" />
                  <el-table-column prop="attemptId" label="尝试" min-width="105" show-overflow-tooltip />
                  <el-table-column prop="participantId" label="参与方" width="72" />
                  <el-table-column prop="phase" label="阶段" width="105" />
                  <el-table-column prop="status" label="状态" width="100" />
                  <el-table-column prop="messageCode" label="消息" min-width="145" show-overflow-tooltip />
                  <el-table-column prop="payloadBytes" label="字节" width="80" />
                  <el-table-column prop="messageDigest" label="摘要" min-width="150" show-overflow-tooltip />
                </el-table>

                <el-collapse v-if="resultData || evidenceData" v-model="artifactPanels" class="artifact-panels">
                  <el-collapse-item v-if="resultData" title="结果原文" name="result"><pre>{{ prettyJson(resultData) }}</pre></el-collapse-item>
                  <el-collapse-item v-if="evidenceData" title="证据原文" name="evidence"><pre>{{ prettyJson(evidenceData) }}</pre></el-collapse-item>
                </el-collapse>
              </div>
              <el-empty v-else description="从左侧选择任务以查看审批、事件、结果和证据" />
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>

<script>
import { fetchRegisteredDatasets } from '@/api/registrationApi'
import { fetchAllPages } from '@/utils/dataset-catalog'
import {
  approvePrivacyJob,
  cancelPrivacyJob,
  createPrivacyJob,
  fetchPrivacyCapabilities,
  fetchPrivacyJob,
  fetchPrivacyJobEvents,
  fetchPrivacyJobEvidence,
  fetchPrivacyJobResult,
  fetchPrivacyJobs,
  fetchPrivacyTemplates,
  preflightPrivacyJob,
  privacyRequestId,
  rejectPrivacyJob,
  retryPrivacyJob
} from '@/api/privacyComputingApi'

const TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'ABORTED', 'CANCELLED']
const TEMPLATE_ROLES = {
  'secure-sum-3p-v1': ['PARTY', 'PARTY', 'PARTY'],
  'private-stats-3p-v1': ['PARTY', 'PARTY', 'PARTY'],
  'private-threshold-3p-v1': ['PARTY', 'PARTY', 'PARTY'],
  'psi-2p-v1': ['RECEIVER', 'PROVIDER'],
  'psi-3p-v1': ['PARTY', 'PARTY', 'PARTY'],
  'pir-keyword-2p-v1': ['CLIENT', 'SERVER'],
  'he-paillier-2p-v1': ['KEY_HOLDER', 'DATA_HOLDER'],
  'hfl-fedavg-logreg-3p-v1': ['TRAINER', 'TRAINER', 'TRAINER'],
  'vfl-secureboost-2p-v1': ['ACTIVE', 'PASSIVE']
}
const TEMPLATE_FIELDS = {
  'secure-sum-3p-v1': [['value'], ['value'], ['value']],
  'private-stats-3p-v1': [['value'], ['value'], ['value']],
  'private-threshold-3p-v1': [['value'], ['value'], ['value']],
  'psi-2p-v1': [['id'], ['id']],
  'psi-3p-v1': [['id'], ['id'], ['id']],
  'pir-keyword-2p-v1': [['query'], ['key', 'value']],
  'he-paillier-2p-v1': [['value'], ['value']],
  'hfl-fedavg-logreg-3p-v1': [['features', 'label'], ['features', 'label'], ['features', 'label']],
  'vfl-secureboost-2p-v1': [['id', 'label', 'features'], ['id', 'features']]
}

export default {
  name: 'PrivacyComputing',
  data() {
    return {
      activeTab: 'capabilities',
      capabilities: [],
      templates: [],
      datasets: [],
      jobs: [],
      events: [],
      selectedJob: null,
      catalogLoading: false,
      jobsLoading: false,
      detailLoading: false,
      preflightLoading: false,
      creating: false,
      actionLoading: '',
      statusFilter: '',
      actionPrincipal: 'A',
      artifactPrincipal: 'A',
      createPrincipal: 'A',
      partySecrets: { A: '', B: '', C: '' },
      decisionReason: '',
      preflight: null,
      preflightSpecJson: '',
      formError: '',
      resultData: null,
      evidenceData: null,
      artifactPanels: [],
      refreshTimer: null,
      jobForm: {
        templateId: '',
        securityProfile: '',
        participants: [],
        resultRecipients: ['A'],
        timeoutSeconds: 1800,
        enginePolicy: {}
      },
      statuses: ['AWAITING_APPROVAL', 'QUEUED', 'PREPARING', 'RUNNING', 'FINALIZING', 'SUCCEEDED', 'FAILED', 'ABORTED', 'CANCELLED'],
      declaredLimits: [
        { name: '恶意安全 PSI', reason: '首期 PSI 使用 SecretFlow 半诚实协议。' },
        { name: '仅输出基数的 PSI-CA', reason: '首期不提供真正只泄露交集基数的模板。' },
        { name: '掉线恢复', reason: 'Flower Provider 仅保留接口，任务要求参与方全部在线。' },
        { name: '通用 FHE', reason: '仅提供 Paillier 加法、明文乘法和点积。' },
        { name: 'TEE', reason: '当前集群没有可用 SGX 设备和资源。' },
        { name: '抵御集群管理员', reason: 'A/B/C 位于同一集群，只提供逻辑隔离。' }
      ]
    }
  },
  computed: {
    selectedTemplate() {
      return this.templates.find(item => item.templateId === this.jobForm.templateId) || null
    },
    participantIds() {
      return this.jobForm.participants.map(item => item.partyId)
    },
    participantIdsForJob() {
      const parties = this.jobParticipants.map(item => item.partyId).filter(Boolean)
      return parties.length ? parties : ['A']
    },
    isFederatedTemplate() {
      return this.jobForm.templateId.startsWith('hfl-') || this.jobForm.templateId.startsWith('vfl-')
    },
    policyFieldOptions() {
      return [...new Set(this.jobForm.participants.reduce((values, participant) =>
        values.concat(Array.isArray(participant.fields) ? participant.fields : []), []))]
    },
    psiKeyOptions() {
      const bindings = this.jobForm.participants.map(item => this.arrayValue(item.fields))
      if (!bindings.length) return []
      return bindings[0].filter(field => bindings.every(items => items.includes(field)))
    },
    jobParticipants() {
      if (!this.selectedJob || !Array.isArray(this.selectedJob.participants)) return []
      const approvals = Array.isArray(this.selectedJob.approvals) ? this.selectedJob.approvals : []
      return this.selectedJob.participants.map(participant => ({
        ...participant,
        currentApproval: approvals.find(item => item.participantId === participant.partyId) || null
      }))
    },
    canPreflight() {
      return Boolean(this.selectedTemplate && this.selectedTemplate.available && this.jobForm.resultRecipients.length &&
        this.participantIds.includes(this.createPrincipal) && this.hasSecret(this.createPrincipal) && this.enginePolicyValid() &&
        this.jobForm.participants.length === Number(this.selectedTemplate.participantCount) &&
        this.jobForm.participants.every(item => item.datasetId && item.datasetVersion && item.displaySha256 && item.fields.length))
    },
    canCreate() {
      return Boolean(this.preflight && this.preflight.valid && this.preflightSpecJson === JSON.stringify(this.buildJobSpec()))
    },
    canCancelSelected() {
      return this.selectedJob && !TERMINAL_STATUSES.includes(this.selectedJob.status) &&
        this.participantIdsForJob.includes(this.actionPrincipal) && this.hasSecret(this.actionPrincipal)
    },
    canRetrySelected() {
      return this.selectedJob && ['FAILED', 'ABORTED', 'CANCELLED'].includes(this.selectedJob.status) &&
        this.actionPrincipal === this.selectedJob.initiator && this.hasSecret(this.actionPrincipal)
    },
    canReadResult() {
      return this.selectedJob && this.selectedJob.status === 'SUCCEEDED' &&
        this.arrayValue(this.selectedJob.resultRecipients).includes(this.artifactPrincipal) && this.hasSecret(this.artifactPrincipal)
    },
    canReadEvidence() {
      return this.selectedJob && this.participantIdsForJob.includes(this.artifactPrincipal) && this.hasSecret(this.artifactPrincipal)
    }
  },
  async created() {
    await Promise.all([this.loadCatalog(), this.loadDatasets()])
    this.refreshTimer = setInterval(() => this.refreshQuietly(), 8000)
  },
  beforeDestroy() {
    clearInterval(this.refreshTimer)
    this.partySecrets = { A: '', B: '', C: '' }
  },
  methods: {
    arrayValue(value) { return Array.isArray(value) ? value : [] },
    prettyJson(value) { return JSON.stringify(value, null, 2) },
    issueText(item) { return typeof item === 'string' ? item : (item.message || item.reason || JSON.stringify(item)) },
    issueKey(item) { return typeof item === 'string' ? item : `${item.code || ''}-${item.message || item.reason || JSON.stringify(item)}` },
    availabilityTag(status) { return status === 'AVAILABLE' ? 'success' : (status === 'RESERVED' ? 'warning' : 'danger') },
    availabilityText(status) { return { AVAILABLE: '可用', UNAVAILABLE: '不可用', RESERVED: '预留' }[status] || status || '未知' },
    securityTag(profile) { return String(profile || '').includes('MALICIOUS') ? 'danger' : 'warning' },
    securityText(profile) { return { MALICIOUS_3PC: '诚实多数三方恶意安全', MALICIOUS_3PC_HONEST_MAJORITY: '诚实多数三方恶意安全', SEMI_HONEST: '半诚实', SEMI_HONEST_PIR: '半诚实 PIR', SEMI_HONEST_HE: '半诚实 + HE', SEMI_HONEST_FL: '半诚实联邦学习', RESERVED: '预留' }[profile] || profile || '未声明' },
    roleText(role) { return { PARTY: '协议参与方', RECEIVER: '交集接收方', PROVIDER: '数据提供方', CLIENT: '查询方', SERVER: '服务方', KEY_HOLDER: '密钥持有方', DATA_HOLDER: '数据持有方', TRAINER: '训练参与方', ACTIVE: '主动方', PASSIVE: '被动方' }[role] || role || '—' },
    statusText(status) { return { AWAITING_APPROVAL: '等待审批', QUEUED: '已排队', PREPARING: '准备中', RUNNING: '运行中', FINALIZING: '收尾中', SUCCEEDED: '成功', FAILED: '失败', ABORTED: '已中止', CANCELLED: '已取消' }[status] || status || '未知' },
    statusTag(status) { return { AWAITING_APPROVAL: 'warning', QUEUED: 'info', PREPARING: 'info', RUNNING: '', FINALIZING: '', SUCCEEDED: 'success', FAILED: 'danger', ABORTED: 'danger', CANCELLED: 'info' }[status] || 'info' },
    decisionTag(status) { return status === 'APPROVED' ? 'success' : (status === 'REJECTED' ? 'danger' : 'warning') },
    approvalState(participant) {
      if (participant.currentApproval && participant.currentApproval.decision) return participant.currentApproval.decision
      if (!this.selectedJob) return 'PENDING'
      const events = this.events.filter(item => item.participantId === participant.partyId &&
        item.attemptId === this.selectedJob.attemptId &&
        (item.phase === 'APPROVAL' || /APPROV|REJECT/.test(`${item.status || ''}${item.messageCode || ''}`)))
      const latest = events[events.length - 1]
      const marker = latest ? `${latest.status || ''} ${latest.messageCode || ''}` : ''
      if (/REJECT/.test(marker)) return 'REJECTED'
      if (/APPROV/.test(marker)) return 'APPROVED'
      return 'PENDING'
    },
    failureText(job) { return job.failureReason ? `${job.failureCode || 'FAILED'}：${job.failureReason}` : '—' },
    hasSecret(partyId) { return Boolean(partyId && this.partySecrets[partyId]) },
    credentialsFor(partyId) { return { partyId, secret: this.partySecrets[partyId] || '' } },
    clearArtifactData() {
      this.resultData = null
      this.evidenceData = null
      this.artifactPanels = []
    },
    onSecretChange(partyId) {
      if (partyId === this.artifactPrincipal) this.clearArtifactData()
      if (partyId === this.actionPrincipal) {
        this.jobs = []
        this.selectedJob = null
        this.events = []
      }
      if (partyId === this.createPrincipal) this.invalidatePreflight()
    },
    onCreatePrincipalChange() {
      this.syncRecipientsFromPolicy()
      this.invalidatePreflight()
    },
    async onActionPrincipalChange() {
      this.jobs = []
      this.selectedJob = null
      this.events = []
      this.clearArtifactData()
      this.artifactPrincipal = this.actionPrincipal
      if (this.hasSecret(this.actionPrincipal)) await this.loadJobs()
    },
    async loadCatalog() {
      this.catalogLoading = true
      try {
        const [capabilities, templates] = await Promise.all([fetchPrivacyCapabilities(), fetchPrivacyTemplates()])
        this.capabilities = this.arrayValue(capabilities)
        this.templates = this.arrayValue(templates)
        if (!this.jobForm.templateId) {
          const first = this.templates.find(item => item.available)
          if (first) {
            this.jobForm.templateId = first.templateId
            this.applyTemplate(first.templateId)
          }
        }
      } catch (error) {
        this.$message.error(`隐私计算能力加载失败：${error.message}`)
      } finally {
        this.catalogLoading = false
      }
    },
    async loadDatasets() {
      try {
        this.datasets = await fetchAllPages(params => fetchRegisteredDatasets({ ...params, status: 'ACTIVE' }, { silent: true }))
      } catch (error) {
        this.$message.error(`数据集加载失败：${error.message}`)
      }
    },
    rolesForTemplate(template) {
      const explicit = TEMPLATE_ROLES[template.templateId]
      if (explicit) return explicit
      return Array.from({ length: Number(template.participantCount) || 0 }, () => 'PARTY')
    },
    fieldsForTemplate(template, index) {
      const fields = TEMPLATE_FIELDS[template.templateId]
      return fields && fields[index] ? fields[index] : ['value']
    },
    defaultEnginePolicy(templateId) {
      if (templateId === 'private-stats-3p-v1') return { scale: 1000 }
      if (templateId === 'private-threshold-3p-v1') {
        return { programId: 'topic4_private_threshold_100', threshold: 100, scale: 1 }
      }
      if (templateId === 'psi-2p-v1' || templateId === 'psi-3p-v1') {
        return { keyColumns: ['id'], outputMode: 'RECEIVER_ONLY' }
      }
      if (templateId === 'pir-keyword-2p-v1') return { queryColumn: 'query', valueColumns: ['value'] }
      if (templateId === 'he-paillier-2p-v1') return { operation: 'ADD', scale: 1000 }
      if (templateId.startsWith('hfl-') || templateId.startsWith('vfl-')) {
        return { labelColumn: 'label', featureColumns: ['features'], epochs: 10, learningRate: 0.1, seed: 20260919 }
      }
      return {}
    },
    applyTemplate(templateId) {
      const template = this.templates.find(item => item.templateId === templateId)
      if (!template) return
      const previous = this.jobForm.participants.reduce((map, item) => ({ ...map, [item.partyId]: item }), {})
      const roles = this.rolesForTemplate(template)
      this.jobForm.securityProfile = template.securityProfile
      this.jobForm.timeoutSeconds = Math.min(template.maxTimeoutSeconds || 1800, template.operation && template.operation.includes('FL') ? 3600 : 1800)
      this.jobForm.participants = roles.map((role, index) => {
        const partyId = String.fromCharCode(65 + index)
        const old = previous[partyId] || {}
        return {
          partyId,
          role,
          datasetId: old.datasetId || null,
          datasetVersion: old.datasetVersion || '',
          displaySha256: '',
          fields: []
        }
      })
      if (!this.participantIds.includes(this.createPrincipal)) this.createPrincipal = this.participantIds[0] || 'A'
      this.jobForm.enginePolicy = this.defaultEnginePolicy(templateId)
      this.jobForm.participants.forEach(participant => {
        if (participant.datasetId) this.syncParticipantDataset(participant, false)
      })
      this.syncRecipientsFromPolicy()
      this.invalidatePreflight()
    },
    normalizeDigest(value) {
      const normalized = String(value || '').trim().toLowerCase().replace(/^sha256:/, '')
      return /^[0-9a-f]{64}$/.test(normalized) ? normalized : ''
    },
    datasetDigest(dataset) {
      if (!dataset) return ''
      const metadata = dataset.metadata || dataset.datasetMetadata || {}
      const authority = this.normalizeDigest(dataset.authoritativeSha256 || dataset.authoritativeDigest ||
        metadata.authoritativeSha256 ||
        (String(metadata.digestAlgorithm || '').toUpperCase() === 'SHA-256' ? metadata.digestValue : '') ||
        (String(dataset.digestAlgorithm || '').toUpperCase() === 'SHA-256' ? dataset.digestValue : ''))
      if (authority) return authority
      const replicas = dataset && Array.isArray(dataset.replicas) ? dataset.replicas : []
      const replica = replicas.find(item =>
        this.normalizeDigest(item.checksum) &&
        String(item.checksumAlgorithm || '').toUpperCase().replace('-', '') === 'SHA256' &&
        (item.effectiveAvailability === 'USABLE' || item.availability === 'USABLE'))
      return replica ? this.normalizeDigest(replica.checksum) : ''
    },
    collectSchemaFields(node, parent, output) {
      if (node == null) return
      if (typeof node === 'string') {
        try { this.collectSchemaFields(JSON.parse(node), parent, output) } catch (error) { if (error) return }
      } else if (Array.isArray(node)) {
        node.forEach(item => {
          if (typeof item === 'string' && (parent === 'fields' || parent === 'columns')) output.add(item)
          else this.collectSchemaFields(item, parent, output)
        })
      } else if (typeof node === 'object') {
        if (typeof node.name === 'string') output.add(node.name)
        Object.keys(node).forEach(key => {
          if (parent === 'properties' || parent === 'tensors') output.add(key)
          this.collectSchemaFields(node[key], key, output)
        })
      }
    },
    datasetFields(dataset) {
      const output = new Set()
      if (dataset) {
        this.collectSchemaFields(dataset.schema || dataset.schemaJson ||
          (dataset.metadata && (dataset.metadata.schema || dataset.metadata.schemaJson)), null, output)
      }
      return [...output].filter(field => /^[A-Za-z0-9_.-]{1,128}$/.test(field)).sort()
    },
    participantFieldOptions(participant) {
      if (!participant) return []
      const dataset = this.datasets.find(item => String(item.datasetId) === String(participant.datasetId))
      return this.datasetFields(dataset)
    },
    syncParticipantDataset(participant, invalidate = true) {
      const dataset = this.datasets.find(item => String(item.datasetId) === String(participant.datasetId))
      participant.datasetVersion = dataset ? dataset.version : ''
      participant.displaySha256 = this.datasetDigest(dataset)
      const options = this.datasetFields(dataset)
      const index = this.jobForm.participants.indexOf(participant)
      const suggested = this.fieldsForTemplate(this.selectedTemplate || { templateId: this.jobForm.templateId }, index)
      participant.fields = suggested.filter(field => options.includes(field))
      if (!participant.fields.length && options.length) participant.fields = [options[0]]
      this.normalizePolicyFields()
      if (invalidate) this.invalidatePreflight()
    },
    normalizePolicyFields() {
      const policy = this.jobForm.enginePolicy
      const available = this.policyFieldOptions
      const keyAvailable = this.jobForm.templateId.startsWith('psi-') ? this.psiKeyOptions : available
      if (Array.isArray(policy.keyColumns)) policy.keyColumns = policy.keyColumns.filter(item => keyAvailable.includes(item))
      if (policy.queryColumn && !available.includes(policy.queryColumn)) policy.queryColumn = ''
      if (Array.isArray(policy.valueColumns)) policy.valueColumns = policy.valueColumns.filter(item => available.includes(item))
      if (policy.labelColumn && !available.includes(policy.labelColumn)) policy.labelColumn = ''
      if (Array.isArray(policy.featureColumns)) policy.featureColumns = policy.featureColumns.filter(item => available.includes(item))
      if (policy.keyColumns && !policy.keyColumns.length && keyAvailable.length) policy.keyColumns = [keyAvailable[0]]
      if (Object.prototype.hasOwnProperty.call(policy, 'queryColumn') && !policy.queryColumn && available.length) policy.queryColumn = available[0]
      if (policy.valueColumns && !policy.valueColumns.length && available.length) policy.valueColumns = [available[0]]
      if (Object.prototype.hasOwnProperty.call(policy, 'labelColumn') && !policy.labelColumn && available.length) policy.labelColumn = available.find(item => /label|target|class/i.test(item)) || available[0]
      if (policy.featureColumns && !policy.featureColumns.length) policy.featureColumns = available.filter(item => item !== policy.labelColumn).slice(0, 20)
    },
    onFieldBindingChange() {
      this.normalizePolicyFields()
      this.invalidatePreflight()
    },
    onPolicyChange() { this.invalidatePreflight() },
    onOutputModeChange() {
      this.syncRecipientsFromPolicy()
      this.invalidatePreflight()
    },
    syncRecipientsFromPolicy() {
      const templateId = this.jobForm.templateId
      if ((templateId === 'psi-2p-v1' || templateId === 'psi-3p-v1') &&
        this.jobForm.enginePolicy.outputMode === 'ALL_PARTIES') {
        this.jobForm.resultRecipients = [...this.participantIds]
      } else if (templateId === 'psi-2p-v1' || templateId === 'pir-keyword-2p-v1') {
        this.jobForm.resultRecipients = ['A']
      } else this.jobForm.resultRecipients = [this.createPrincipal]
    },
    enginePolicyValid() {
      const templateId = this.jobForm.templateId
      const policy = this.jobForm.enginePolicy
      if (templateId === 'secure-sum-3p-v1') return Object.keys(policy).length === 0
      if (templateId === 'private-stats-3p-v1') return Number(policy.scale) > 0
      if (templateId === 'private-threshold-3p-v1') {
        return policy.programId === 'topic4_private_threshold_100' && policy.threshold === 100 && Number(policy.scale) > 0
      }
      if (templateId === 'psi-2p-v1' || templateId === 'psi-3p-v1') {
        return Array.isArray(policy.keyColumns) && policy.keyColumns.length > 0 &&
          policy.keyColumns.every(item => this.psiKeyOptions.includes(item)) &&
          ['RECEIVER_ONLY', 'ALL_PARTIES'].includes(policy.outputMode)
      }
      if (templateId === 'pir-keyword-2p-v1') {
        const queryFields = this.jobForm.participants[0] ? this.arrayValue(this.jobForm.participants[0].fields) : []
        const valueFields = this.jobForm.participants[1] ? this.arrayValue(this.jobForm.participants[1].fields) : []
        return Boolean(queryFields.includes(policy.queryColumn) && this.arrayValue(policy.valueColumns).length &&
          policy.valueColumns.every(item => valueFields.includes(item)))
      }
      if (templateId === 'he-paillier-2p-v1') {
        return ['ADD', 'PLAINTEXT_MULTIPLY', 'DOT_PRODUCT'].includes(policy.operation) && Number(policy.scale) > 0
      }
      if (templateId.startsWith('hfl-') || templateId.startsWith('vfl-')) {
        return Boolean(policy.labelColumn && this.arrayValue(policy.featureColumns).length &&
          Number(policy.epochs) > 0 && Number(policy.learningRate) > 0 && Number.isInteger(Number(policy.seed)))
      }
      return false
    },
    buildJobSpec() {
      return {
        templateId: this.jobForm.templateId,
        securityProfile: this.jobForm.securityProfile,
        participants: this.jobForm.participants.map(item => ({
          partyId: item.partyId,
          role: item.role,
          datasetId: String(item.datasetId),
          datasetVersion: item.datasetVersion,
          fields: [...item.fields]
        })),
        resultRecipients: [...this.jobForm.resultRecipients],
        timeoutSeconds: this.jobForm.timeoutSeconds,
        enginePolicy: { ...this.jobForm.enginePolicy }
      }
    },
    invalidatePreflight() {
      this.preflight = null
      this.preflightSpecJson = ''
      this.formError = ''
    },
    async runPreflight() {
      this.preflightLoading = true
      this.formError = ''
      const spec = this.buildJobSpec()
      try {
        this.preflight = await preflightPrivacyJob(spec, this.credentialsFor(this.createPrincipal))
        this.preflightSpecJson = JSON.stringify(spec)
      } catch (error) {
        this.preflight = null
        this.preflightSpecJson = ''
        this.formError = `预检请求失败：${error.message}`
      } finally {
        this.preflightLoading = false
      }
    },
    async createJob() {
      if (!this.canCreate) return
      this.creating = true
      this.formError = ''
      try {
        const created = await createPrivacyJob(this.buildJobSpec(), privacyRequestId(), this.credentialsFor(this.createPrincipal))
        this.$message.success('隐私计算任务已创建，等待参与方审批')
        this.actionPrincipal = this.createPrincipal
        await this.loadJobs()
        const jobId = created.jobId || (created.job && created.job.jobId)
        if (jobId) await this.openJob({ jobId })
        this.activeTab = 'jobs'
      } catch (error) {
        this.formError = `任务创建失败：${error.message}`
      } finally {
        this.creating = false
      }
    },
    async loadJobs(options = {}) {
      if (!this.hasSecret(this.actionPrincipal)) {
        if (!options.silent) this.$message.warning(`请输入参与方 ${this.actionPrincipal} 的 secret`)
        return
      }
      if (!options.silent) this.jobsLoading = true
      try {
        const result = await fetchPrivacyJobs(
          { status: this.statusFilter || undefined, limit: 100 },
          this.credentialsFor(this.actionPrincipal),
          options.silent ? { silent: true } : {}
        )
        this.jobs = Array.isArray(result) ? result : this.arrayValue(result && result.list)
      } catch (error) {
        if (!options.silent) this.$message.error(`任务列表加载失败：${error.message}`)
      } finally {
        if (!options.silent) this.jobsLoading = false
      }
    },
    async refreshJobs() {
      await this.loadJobs()
      if (this.selectedJob) await this.openJob(this.selectedJob)
    },
    async refreshQuietly() {
      if (this.activeTab !== 'jobs' || !this.hasSecret(this.actionPrincipal)) return
      await this.loadJobs({ silent: true })
      if (this.selectedJob && !TERMINAL_STATUSES.includes(this.selectedJob.status)) await this.openJob(this.selectedJob, true)
    },
    async openJob(row, silent = false) {
      const jobId = row && row.jobId
      if (!jobId) return
      if (!silent) this.detailLoading = true
      try {
        const [job, events] = await Promise.all([
          fetchPrivacyJob(jobId, this.credentialsFor(this.actionPrincipal), silent ? { silent: true } : {}),
          fetchPrivacyJobEvents(jobId, this.credentialsFor(this.actionPrincipal), silent ? { silent: true } : {})
        ])
        this.selectedJob = job
        this.events = this.arrayValue(events)
        this.clearArtifactData()
        const parties = Array.isArray(job.resultRecipients) ? job.resultRecipients : []
        this.artifactPrincipal = parties[0] || (this.jobParticipants[0] && this.jobParticipants[0].partyId) || 'A'
      } catch (error) {
        if (!silent) this.$message.error(`任务详情加载失败：${error.message}`)
      } finally {
        if (!silent) this.detailLoading = false
      }
    },
    canDecide(participant) {
      return this.selectedJob && this.selectedJob.status === 'AWAITING_APPROVAL' && this.hasSecret(participant.partyId) &&
        !['APPROVED', 'REJECTED'].includes(this.approvalState(participant))
    },
    async decideParticipant(action, participant) {
      if (!this.canDecide(participant)) return
      if (action === 'reject' && !this.decisionReason) return this.$message.warning('拒绝任务时必须填写理由')
      const key = `${action}-${participant.partyId}`
      this.actionLoading = key
      try {
        const credentials = this.credentialsFor(participant.partyId)
        if (action === 'approve') await approvePrivacyJob(this.selectedJob.jobId, participant.partyId, this.decisionReason, credentials)
        else await rejectPrivacyJob(this.selectedJob.jobId, participant.partyId, this.decisionReason, credentials)
        this.$message.success(`参与方 ${participant.partyId} 已${action === 'approve' ? '批准' : '拒绝'}任务`)
        this.decisionReason = ''
        this.actionPrincipal = participant.partyId
        this.clearArtifactData()
        await this.openJob(this.selectedJob)
        await this.loadJobs({ silent: true })
      } catch (error) {
        this.$message.error(`审批失败：${error.message}`)
      } finally {
        this.actionLoading = ''
      }
    },
    async cancelSelectedJob() {
      try {
        await this.$confirm('确认取消当前隐私计算任务？', '取消任务', { type: 'warning' })
      } catch (action) {
        return
      }
      this.actionLoading = 'cancel'
      try {
        await cancelPrivacyJob(this.selectedJob.jobId, this.decisionReason || '由隐私计算控制台取消', this.credentialsFor(this.actionPrincipal))
        this.$message.success('取消请求已提交')
        await this.refreshJobs()
      } catch (error) {
        this.$message.error(`取消失败：${error.message}`)
      } finally {
        this.actionLoading = ''
      }
    },
    async retrySelectedJob() {
      this.actionLoading = 'retry'
      try {
        await retryPrivacyJob(this.selectedJob.jobId, this.credentialsFor(this.actionPrincipal), privacyRequestId())
        this.$message.success('已创建使用新密钥和随机材料的尝试')
        await this.refreshJobs()
      } catch (error) {
        this.$message.error(`重试失败：${error.message}`)
      } finally {
        this.actionLoading = ''
      }
    },
    async loadArtifact(kind, download) {
      if (!this.selectedJob) return
      try {
        const credentials = this.credentialsFor(this.artifactPrincipal)
        const data = kind === 'result'
          ? await fetchPrivacyJobResult(this.selectedJob.jobId, credentials)
          : await fetchPrivacyJobEvidence(this.selectedJob.jobId, credentials)
        if (kind === 'result') this.resultData = data
        else this.evidenceData = data
        if (!this.artifactPanels.includes(kind)) this.artifactPanels.push(kind)
        if (download) this.downloadJson(data, `${this.selectedJob.jobId}-${kind}.json`)
      } catch (error) {
        this.$message.error(`${kind === 'result' ? '结果' : '证据'}读取失败：${error.message}`)
      }
    },
    downloadJson(data, fileName) {
      const blob = new Blob([this.prettyJson(data)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.privacy-page { min-height: calc(100vh - 90px); background: #f4f7fa; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
.page-heading h2 { margin: 0 0 7px; color: #1f3447; font-size: 24px; }
.page-heading p { margin: 0; color: #667786; line-height: 1.65; }
.auth-card { margin-top: 14px; padding: 16px 18px; border: 1px solid #dfe8ee; border-radius: 8px; background: #fff; box-shadow: 0 2px 9px rgba(32, 55, 76, .04); }
.auth-copy { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.auth-copy h3 { margin: 0; color: #2b4254; }
.auth-copy p { margin: 0; color: #7a8995; font-size: 13px; line-height: 1.5; }
.workspace-card { margin-top: 16px; padding: 8px 22px 24px; background: #fff; border-radius: 8px; box-shadow: 0 2px 9px rgba(32, 55, 76, .06); }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 14px; }
.section-heading h3 { display: inline; margin: 0 12px 0 0; color: #263b4d; }
.section-heading span { color: #84919c; font-size: 13px; }
.template-heading { margin-top: 26px; }
.cell-note { margin-top: 3px; color: #8b98a3; font-family: monospace; font-size: 12px; }
.inline-tag { margin: 2px 4px 2px 0; }
.digest { display: inline-block; max-width: 100%; color: #607080; font-family: monospace; font-size: 12px; overflow-wrap: anywhere; }
.experimental { margin: 5px 0 0 5px; }
.engine-warning { margin-bottom: 14px; }
.limit-card { min-height: 92px; margin-bottom: 12px; padding: 14px 16px; border: 1px solid #ebeef2; border-radius: 6px; background: #fafbfc; }
.limit-card strong { margin-left: 8px; color: #334a5d; }
.limit-card p { margin: 10px 0 0; color: #73818d; font-size: 13px; line-height: 1.5; }
.job-form { margin-top: 10px; }
.participant-heading { margin-top: 22px; }
.party-card { min-height: 350px; margin-bottom: 14px; padding: 15px; border: 1px solid #dfe7ed; border-radius: 7px; background: #fbfcfd; }
.party-title { display: flex; align-items: center; margin-bottom: 14px; color: #344b5e; }
.party-badge { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; margin-right: 9px; border-radius: 50%; color: #fff; background: #3b7ca7; font-weight: 700; }
.digest-input ::v-deep input { font-family: monospace; font-size: 12px; }
.field-warning { display: block; margin-top: 5px; color: #e6a23c; font-size: 12px; line-height: 1.4; }
.policy-card { margin: 8px 0 18px; padding: 15px 16px 3px; border: 1px solid #dfe7ed; border-radius: 7px; background: #f8fafc; }
.policy-row { margin-top: 8px; }
.form-actions { display: flex; align-items: center; gap: 10px; padding-top: 6px; }
.spec-digest { max-width: 55%; margin-left: 7px; color: #778590; font-family: monospace; font-size: 12px; overflow-wrap: anywhere; }
.feedback, .preflight-panel { margin-top: 18px; }
.issue-list { margin: 10px 0 0; padding: 10px 10px 10px 34px; border-radius: 5px; line-height: 1.7; }
.error-list { color: #b83c3c; background: #fff1f0; }
.warning-list { color: #91631a; background: #fff8e6; }
.jobs-toolbar { display: flex; align-items: center; gap: 10px; margin: 7px 0 15px; }
.jobs-toolbar span { color: #7e8b96; font-size: 13px; }
.job-detail { min-height: 470px; padding: 17px; border: 1px solid #e1e7ec; border-radius: 7px; }
.detail-title { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 15px; }
.detail-title h3 { margin: 0 0 5px; color: #263d50; font-family: monospace; font-size: 17px; }
.detail-title span { color: #84909a; font-size: 13px; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.detail-actions .el-button + .el-button { margin-left: 0; }
.principal-select { width: 126px; }
.approval-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 16px 0 9px; }
.approval-heading h4, .job-detail > h4 { margin: 0; color: #344a5b; }
.approval-heading .el-input { max-width: 310px; }
.job-detail > h4 { margin: 20px 0 9px; }
.danger-text { color: #f56c6c; }
.artifact-panels { margin-top: 18px; }
.artifact-panels pre { max-height: 360px; margin: 0; padding: 13px; overflow: auto; border-radius: 5px; color: #d9e4ec; background: #263640; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
@media (max-width: 768px) {
  .page-heading, .section-heading, .approval-heading, .auth-copy { align-items: stretch; flex-direction: column; }
  .jobs-toolbar { align-items: stretch; flex-direction: column; }
  .spec-digest { max-width: 100%; }
}
</style>
