<template>
  <div class="registry-page">
    <el-card>
      <div slot="header" class="toolbar"><span>数据集注册</span><div><el-input v-model="query" size="small" clearable placeholder="名称 / 路径" class="search" @keyup.enter.native="load" /><el-button size="small" @click="load">刷新</el-button><el-button size="small" @click="discover">扫描节点数据</el-button><el-button size="small" type="primary" @click="openUpload">上传并注册</el-button></div></div>
      <el-tabs v-model="tab" @tab-click="load">
        <el-tab-pane label="待注册候选" name="candidates">
          <el-table v-loading="loading" :data="rows">
            <el-table-column prop="candidateId" label="ID" width="70" /><el-table-column prop="fileName" label="文件名" min-width="180" /><el-table-column prop="filePath" label="路径" min-width="280" show-overflow-tooltip /><el-table-column prop="nodeId" label="节点" width="90" /><el-table-column prop="availability" label="可用性" width="110" />
            <el-table-column label="操作" width="90"><template slot-scope="s"><el-button type="text" @click="openRegister(s.row)">注册</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="已注册数据集" name="registered">
          <el-table v-loading="loading" :data="rows" @selection-change="selected=$event">
            <el-table-column type="selection" width="45" :selectable="row => row.status === 'ACTIVE' && row.availableReplicaCount > 0" /><el-table-column prop="datasetCode" label="编码" min-width="130" /><el-table-column prop="name" label="名称" min-width="150" /><el-table-column prop="version" label="版本" width="90" /><el-table-column prop="dataType" label="类型" width="100" /><el-table-column prop="status" label="注册状态" width="110" /><el-table-column label="副本健康" width="120"><template slot-scope="s"><el-tag size="mini" :type="healthTag(s.row.healthStatus)">{{ s.row.healthStatus }}</el-tag></template></el-table-column><el-table-column label="可用副本" width="100"><template slot-scope="s">{{ s.row.availableReplicaCount }}/{{ s.row.totalReplicaCount }}</template></el-table-column><el-table-column prop="statusReason" label="状态原因" min-width="180" show-overflow-tooltip /><el-table-column prop="defaultRuntimeImageId" label="镜像 ID" width="100" />
            <el-table-column label="操作" width="190"><template slot-scope="s"><el-button type="text" @click="act(verifyDataset,s.row.datasetId)">校验</el-button><el-button type="text" @click="act(activateDataset,s.row.datasetId)">激活</el-button><el-button type="text" @click="act(disableDataset,s.row.datasetId)">停用</el-button></template></el-table-column>
          </el-table>
          <div class="task-action"><el-button type="primary" :disabled="!selected.length" @click="openTaskDialog">使用所选数据集创建任务</el-button></div>
        </el-tab-pane>
      </el-tabs>
      <el-pagination :current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="changePage" />
    </el-card>
    <el-dialog title="注册数据集" :visible.sync="dialog" width="520px"><el-form label-width="100px"><el-form-item label="数据集编码"><el-input v-model="form.datasetCode" /></el-form-item><el-form-item label="名称"><el-input v-model="form.name" /></el-form-item><el-form-item label="版本"><el-input v-model="form.version" /></el-form-item><el-form-item label="数据类型"><el-input v-model="form.dataType" /></el-form-item><el-form-item label="描述"><el-input v-model="form.description" type="textarea" /></el-form-item></el-form><span slot="footer"><el-button @click="dialog=false">取消</el-button><el-button type="primary" @click="submit">注册</el-button></span></el-dialog>
    <el-dialog title="上传并注册数据集" :visible.sync="uploadDialog" width="580px" :close-on-click-modal="false" :close-on-press-escape="!uploadSaving" :show-close="!uploadSaving">
      <el-alert title="文件将流式写入选定的可用存储节点，并自动创建首个数据副本。当前支持 NPZ 文件。" type="info" :closable="false" show-icon class="upload-tip" />
      <el-form label-width="110px">
        <el-form-item label="目标存储节点" required>
          <el-select v-model="uploadForm.nodeId" filterable placeholder="请选择可用存储节点" class="full-width">
            <el-option v-for="node in uploadNodes" :key="node.nodeId" :label="`${node.displayName || node.k8sNodeName} (${node.role})`" :value="node.nodeId" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据文件" required>
          <el-upload action="#" accept=".npz" :auto-upload="false" :limit="1" :file-list="uploadFileList" :on-change="handleUploadFile" :on-remove="removeUploadFile">
            <el-button size="small" type="primary">选择 NPZ 文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="数据集编码" required><el-input v-model="uploadForm.datasetCode" placeholder="仅字母、数字、点、下划线和横线" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="uploadForm.name" /></el-form-item>
        <el-form-item label="版本" required><el-input v-model="uploadForm.version" /></el-form-item>
        <el-form-item label="数据类型"><el-input value="NPZ" disabled /></el-form-item>
        <el-form-item label="描述"><el-input v-model="uploadForm.description" type="textarea" /></el-form-item>
        <el-progress v-if="uploadSaving" :percentage="uploadProgress" :status="uploadProgress === 100 ? 'success' : undefined" />
      </el-form>
      <span slot="footer"><el-button :disabled="uploadSaving" @click="uploadDialog=false">取消</el-button><el-button type="primary" :loading="uploadSaving" @click="submitUpload">上传并注册</el-button></span>
    </el-dialog>
    <el-dialog title="创建任务" :visible.sync="taskDialog" width="620px"><el-form label-width="100px"><el-form-item label="任务名称"><el-input v-model="task.taskName" /></el-form-item><el-form-item label="运行镜像 ID"><el-input-number v-model="task.runtimeImageId" :min="1" placeholder="留空则使用数据集默认镜像" @change="runPreflight" /></el-form-item></el-form><el-alert v-if="preflight" :title="preflight.valid ? '资源预检查通过' : '资源预检查未通过'" :type="preflight.valid ? 'success' : 'error'" :closable="false" show-icon /><el-table v-if="preflight" :data="preflight.checks" size="mini" class="preflight-table"><el-table-column prop="resourceType" label="资源" width="120" /><el-table-column prop="name" label="名称" min-width="130" /><el-table-column prop="status" label="状态" width="110" /><el-table-column label="结果" width="80"><template slot-scope="s"><el-tag size="mini" :type="s.row.available ? 'success' : 'danger'">{{ s.row.available ? '可用' : '不可用' }}</el-tag></template></el-table-column><el-table-column prop="message" label="说明" min-width="190" show-overflow-tooltip /></el-table><span slot="footer"><el-button @click="taskDialog=false">取消</el-button><el-button type="primary" :loading="preflightLoading" :disabled="!preflight || !preflight.valid" @click="createTask">提交任务</el-button></span></el-dialog>
  </div>
</template>
<script>
import { discoverDatasets, fetchDatasetCandidates, fetchRegisteredDatasets, fetchRegisteredNodes, registerDataset, uploadAndRegisterDataset, verifyDataset, activateDataset, disableDataset, createRegisteredTask, preflightRegisteredTask } from '@/api/registrationApi'
export default {
  name: 'DatasetRegistry',
  data: () => ({
    tab: 'candidates', query: '', page: 1, total: 0, rows: [], selected: [], loading: false,
    dialog: false, form: {},
    uploadDialog: false, uploadSaving: false, uploadProgress: 0, uploadNodes: [], uploadFile: null, uploadFileList: [],
    uploadForm: { nodeId: null, datasetCode: '', name: '', version: '1.0', dataType: 'NPZ', description: '' },
    taskDialog: false, preflight: null, preflightLoading: false, task: { taskName: '', runtimeImageId: undefined }
  }),
  created() { this.load() },
  methods: {
    verifyDataset, activateDataset, disableDataset,
    async load() { this.loading = true; try { const api = this.tab === 'candidates' ? fetchDatasetCandidates : fetchRegisteredDatasets; const r = await api({ page: this.page, pageSize: 20, query: this.query }); this.rows = r.list || []; this.total = r.total || 0 } catch (e) { this.$message.error(e.message || '加载失败') } finally { this.loading = false } },
    async discover() { try { await discoverDatasets(); this.$message.success('扫描已触发'); await this.load() } catch (e) { this.$message.error(e.message || '扫描失败') } },
    openRegister(row) { const base = (row.fileName || 'dataset').replace(/[^a-zA-Z0-9._-]/g, '-'); this.form = { candidateId: row.candidateId, datasetCode: base, name: row.fileName || base, version: '1.0', dataType: row.fileType || 'unknown', description: '' }; this.dialog = true },
    async submit() { try { await registerDataset(this.form); this.dialog = false; this.$message.success('数据集已注册'); await this.load() } catch (e) { this.$message.error(e.message || '注册失败') } },
    async openUpload() {
      try {
        const result = await fetchRegisteredNodes({ page: 1, pageSize: 200, status: 'ACTIVE', enabled: true })
        this.uploadNodes = (result.list || []).filter(node => node.schedulable && ['STORAGE', 'COMPUTE_STORAGE'].includes(node.role))
        if (!this.uploadNodes.length) return this.$message.warning('当前没有可用的存储节点')
        this.uploadForm = { nodeId: this.uploadNodes[0].nodeId, datasetCode: '', name: '', version: '1.0', dataType: 'NPZ', description: '' }
        this.uploadFile = null
        this.uploadFileList = []
        this.uploadProgress = 0
        this.uploadDialog = true
      } catch (e) { this.$message.error(e.message || '加载存储节点失败') }
    },
    handleUploadFile(file, fileList) {
      this.uploadFile = file.raw
      this.uploadFileList = fileList.slice(-1)
      const base = (file.name || 'dataset').replace(/\.npz$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-') || 'dataset'
      if (!this.uploadForm.datasetCode) this.uploadForm.datasetCode = base
      if (!this.uploadForm.name) this.uploadForm.name = base
    },
    removeUploadFile() { this.uploadFile = null; this.uploadFileList = [] },
    async submitUpload() {
      if (!this.uploadForm.nodeId || !this.uploadFile || !this.uploadForm.datasetCode || !this.uploadForm.name || !this.uploadForm.version) return this.$message.warning('请填写必填项并选择 NPZ 文件')
      if (!/\.npz$/i.test(this.uploadFile.name || '')) return this.$message.warning('当前仅支持 NPZ 文件')
      this.uploadSaving = true
      this.uploadProgress = 0
      try {
        const data = new FormData()
        data.append('metadata', new Blob([JSON.stringify(this.uploadForm)], { type: 'application/json' }))
        data.append('file', this.uploadFile)
        const dataset = await uploadAndRegisterDataset(data, event => {
          if (event.total) this.uploadProgress = Math.min(99, Math.round(event.loaded * 100 / event.total))
        })
        this.uploadProgress = 100
        this.uploadDialog = false
        this.tab = 'registered'
        this.$message.success(`数据集 ${dataset.name || dataset.datasetCode} 已上传并注册`)
        await this.load()
      } catch (e) { this.$message.error(e.message || '上传注册失败') } finally { this.uploadSaving = false }
    },
    async act(api, id) { try { await api(id); this.$message.success('操作完成'); await this.load() } catch (e) { this.$message.error(e.message || '操作失败') } },
    healthTag(status) { return status === 'HEALTHY' ? 'success' : status === 'DEGRADED' ? 'warning' : 'danger' },
    taskPayload() { const payload = { taskName: this.task.taskName, datasetIds: this.selected.map(x => x.datasetId) }; if (this.task.runtimeImageId) payload.runtimeImageId = this.task.runtimeImageId; return payload },
    async openTaskDialog() { this.task.taskName = this.task.taskName || `注册任务-${Date.now()}`; this.taskDialog = true; await this.runPreflight() },
    async runPreflight() { if (!this.taskDialog) return; this.preflightLoading = true; try { this.preflight = await preflightRegisteredTask(this.taskPayload()) } catch (e) { this.preflight = null; this.$message.error(e.message || '资源预检查失败') } finally { this.preflightLoading = false } },
    async createTask() { try { await this.runPreflight(); if (!this.preflight || !this.preflight.valid) return; const r = await createRegisteredTask(this.taskPayload()); this.taskDialog = false; this.$message.success(`任务 ${r.taskId} 已接收`) } catch (e) { this.$message.error(e.message || '任务提交失败') } },
    changePage(page) { this.page = page; this.load() }
  }
}
</script>
<style scoped>.registry-page{padding:20px}.toolbar{display:flex;align-items:center;justify-content:space-between;font-weight:600}.search{width:220px;margin-right:8px}.task-action{margin-top:16px}.preflight-table{margin-top:12px}.upload-tip{margin-bottom:18px}.full-width{width:100%}.el-pagination{margin-top:18px;text-align:right}</style>
