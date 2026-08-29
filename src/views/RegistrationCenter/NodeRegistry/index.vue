<template>
  <div class="registry-page">
    <el-card>
      <div slot="header" class="toolbar">
        <span>节点注册</span>
        <div>
          <el-input v-model="query" size="small" clearable placeholder="节点名 / IP" class="search" @keyup.enter.native="load" />
          <el-button size="small" @click="load">刷新</el-button>
          <el-button size="small" type="primary" :loading="discovering" @click="discover">从 Kubernetes 发现</el-button>
        </div>
      </div>
      <el-tabs v-model="tab" @tab-click="load">
        <el-tab-pane label="待注册候选" name="candidates">
          <el-table v-loading="loading" :data="rows">
            <el-table-column prop="clusterId" label="集群" min-width="130" />
            <el-table-column prop="k8sNodeName" label="K8s 节点" min-width="160" />
            <el-table-column prop="internalIp" label="内部 IP" min-width="130" />
            <el-table-column prop="observedRole" label="发现角色" min-width="110" />
            <el-table-column prop="observedStatus" label="状态" min-width="100" />
            <el-table-column label="操作" width="100">
              <template slot-scope="scope"><el-button type="text" :disabled="!!scope.row.registeredNodeId" @click="openRegister(scope.row)">注册</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="已注册节点" name="registered">
          <el-table v-loading="loading" :data="rows">
            <el-table-column prop="nodeId" label="ID" width="70" />
            <el-table-column prop="displayName" label="显示名称" min-width="140" />
            <el-table-column prop="k8sNodeName" label="K8s 节点" min-width="140" />
            <el-table-column prop="role" label="角色" width="120" />
            <el-table-column prop="registrationStatus" label="注册状态" width="120" />
            <el-table-column prop="observedStatus" label="运行状态" width="130" />
            <el-table-column label="有效状态" width="130"><template slot-scope="s"><el-tag size="mini" :type="s.row.schedulable ? 'success' : 'warning'">{{ s.row.effectiveStatus }}</el-tag></template></el-table-column>
            <el-table-column prop="enabled" label="启用" width="70"><template slot-scope="s">{{ s.row.enabled ? '是' : '否' }}</template></el-table-column>
            <el-table-column prop="statusReason" label="状态原因" min-width="180" show-overflow-tooltip />
            <el-table-column label="操作" width="190">
              <template slot-scope="s">
                <el-button type="text" @click="act(verifyNode, s.row.nodeId, '校验完成')">校验</el-button>
                <el-button v-if="!s.row.enabled" type="text" @click="act(enableNode, s.row.nodeId, '已启用')">启用</el-button>
                <el-button v-else type="text" @click="act(disableNode, s.row.nodeId, '已停用')">停用</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
      <el-pagination :current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="changePage" />
    </el-card>
    <el-dialog title="注册节点" :visible.sync="dialog" width="480px">
      <el-form label-width="90px">
        <el-form-item label="显示名称"><el-input v-model="form.displayName" /></el-form-item>
        <el-form-item label="角色"><el-select v-model="form.role"><el-option label="计算节点" value="COMPUTE" /><el-option label="数据节点" value="DATA" /><el-option label="计算/数据" value="COMPUTE_DATA" /></el-select></el-form-item>
        <el-form-item label="立即启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="dialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">注册</el-button></span>
    </el-dialog>
  </div>
</template>
<script>
import { discoverNodes, fetchNodeCandidates, fetchRegisteredNodes, registerNode, verifyNode, enableNode, disableNode } from '@/api/registrationApi'
export default {
  name: 'NodeRegistry',
  data: () => ({ tab: 'candidates', query: '', page: 1, total: 0, rows: [], loading: false, discovering: false, saving: false, dialog: false, form: { candidateId: null, displayName: '', role: 'COMPUTE_DATA', enabled: false }}),
  created() { this.load() },
  methods: {
    verifyNode, enableNode, disableNode,
    async load() { this.loading = true; try { const api = this.tab === 'candidates' ? fetchNodeCandidates : fetchRegisteredNodes; const r = await api({ page: this.page, pageSize: 20, query: this.query }); this.rows = r.list || []; this.total = r.total || 0 } catch (e) { this.$message.error(e.message || '加载失败') } finally { this.loading = false } },
    async discover() { this.discovering = true; try { await discoverNodes(); this.$message.success('节点发现完成'); await this.load() } catch (e) { this.$message.error(e.message || '发现失败') } finally { this.discovering = false } },
    openRegister(row) { this.form = { candidateId: row.candidateId, displayName: row.k8sNodeName, role: row.observedRole || 'COMPUTE_DATA', enabled: false }; this.dialog = true },
    async submit() { this.saving = true; try { await registerNode(this.form); this.dialog = false; this.$message.success('节点已注册'); await this.load() } catch (e) { this.$message.error(e.message || '注册失败') } finally { this.saving = false } },
    async act(api, id, message) { try { await api(id); this.$message.success(message); await this.load() } catch (e) { this.$message.error(e.message || '操作失败') } },
    changePage(page) { this.page = page; this.load() }
  }
}
</script>
<style scoped>.registry-page{padding:20px}.toolbar{display:flex;align-items:center;justify-content:space-between;font-weight:600}.search{width:220px;margin-right:8px}.el-pagination{margin-top:18px;text-align:right}</style>
