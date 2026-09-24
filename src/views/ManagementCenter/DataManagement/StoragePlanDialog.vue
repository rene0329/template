<template>
  <el-dialog title="热敏存储 · 分配预览" :visible.sync="visible" width="820px" :close-on-click-modal="false" :show-close="!submitting" :close-on-press-escape="!submitting">
    <div v-loading="loading">
      <el-alert title="热度达到阈值的数据集，沿网络路径迁到离其就近计算节点最近的存储节点；不迁到计算存储节点，已足够近的数据保持不动。" type="info" :closable="false" show-icon />
      <p>迁移只移动数据、不增加副本：目标文件通过 SHA-256 校验后才删除源文件。请核对操作清单。</p>
      <p>只处理数据，不启动计算任务。有任务正在使用的数据集会等其结束后再迁移。</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <template v-if="preview">
        <p>检查 {{ preview.datasetCount }} 个数据集，计划执行 {{ preview.assignments.length }} 项操作。</p>
        <el-table :data="preview.placements" max-height="320">
          <el-table-column prop="datasetName" label="数据集" min-width="180" show-overflow-tooltip />
          <el-table-column label="热度" width="90"><template slot-scope="scope">{{ formatHeat(scope.row.dataHeat) }}</template></el-table-column>
          <el-table-column prop="sourceNode" label="源节点" />
          <el-table-column prop="targetNode" label="目标节点" />
          <el-table-column label="操作" width="100"><template slot-scope="scope">{{ actionLabel(scope.row.action) }}</template></el-table-column>
          <el-table-column prop="reason" label="依据" min-width="220" show-overflow-tooltip />
        </el-table>
        <ul v-if="preview.notices.length"><li v-for="(notice, index) in preview.notices" :key="index">{{ notice }}</li></ul>
        <el-alert v-if="preview.assignments.some(item => ['MOVE', 'DELETE'].includes(item.action))" title="迁移会在目标文件校验通过后删除源文件；执行端会再次确认没有任务正在使用该数据集。" type="warning" :closable="false" show-icon />
        <p v-if="!preview.assignments.length">当前没有可执行的复制或迁移，请查看上面的提示。</p>
      </template>
      <el-alert v-if="accepted" :title="`调度计划 #${accepted.planId} 已提交，执行结果请查看调度日志。`" type="success" :closable="false" show-icon />
    </div>
    <span slot="footer">
      <el-button :disabled="submitting" @click="visible = false">关闭</el-button>
      <el-button v-if="!accepted" :disabled="submitting" :loading="loading" @click="load">{{ preview ? '重新预览' : '生成预览' }}</el-button>
      <el-button v-if="accepted" type="primary" @click="viewLogs">查看调度日志</el-button>
      <el-button v-else type="primary" :loading="submitting" :disabled="loading || !preview || !preview.assignments.length" @click="submit">确认执行</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { previewDatasetStorage, submitDatasetStorage } from '@/api/datasetStorageApi'
import { requestId } from '@/api/registrationApi'
import { formatHeat } from '@/utils/dataset-catalog'

export default {
  name: 'StoragePlanDialog',
  data() {
    return { visible: false, loading: false, submitting: false, preview: null, error: '', accepted: null, pending: null, version: 0 }
  },
  beforeDestroy() { this.version++ },
  methods: {
    formatHeat,
    actionLabel(action) {
      return { COPY: '复制备份', MOVE: '迁移数据', DELETE: '清退副本' }[action] || action
    },
    open() {
      this.visible = true
      this.accepted = null
      return this.load()
    },
    async load() {
      if (this.submitting) return
      const version = ++this.version
      this.loading = true
      this.error = ''
      this.preview = null
      this.pending = null
      try {
        const preview = await previewDatasetStorage('heat')
        if (version !== this.version) return
        this.preview = preview
        this.pending = { mode: 'heat', externalPlanId: `storage-${requestId()}`, assignments: preview.assignments }
      } catch (error) {
        if (version === this.version) this.error = `分配预览失败：${error.message}`
      } finally {
        if (version === this.version) this.loading = false
      }
    },
    async submit() {
      if (this.loading || this.submitting || this.accepted || !this.pending || !this.pending.assignments.length) return
      this.submitting = true
      this.error = ''
      try {
        const hasDelete = this.pending.assignments.some(item => ['MOVE', 'DELETE'].includes(item.action))
        await this.$confirm(`将执行 ${this.pending.assignments.length} 项数据操作。${hasDelete ? '迁移会在目标文件校验通过后删除对应源文件。' : '复制会保留源文件。'}是否继续？`, '确认批量数据调度', { type: 'warning', confirmButtonText: '确认执行', cancelButtonText: '取消' })
        this.accepted = await submitDatasetStorage(this.pending)
        this.$emit('submitted', this.accepted)
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.error = `提交失败：${error.message || error}`
      } finally {
        this.submitting = false
      }
    },
    viewLogs() {
      this.visible = false
      this.$router.push({ name: 'SchedulingLogs' })
    }
  }
}
</script>
