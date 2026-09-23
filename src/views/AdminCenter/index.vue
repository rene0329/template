<template>
  <el-container class="admin-page">
    <el-main>
      <section class="page-heading">
        <div><h2>系统管理</h2><p>管理协同业务域和账号角色。已被任务引用的记录只能停用。</p></div>
        <el-button icon="el-icon-refresh" :loading="loading" @click="loadAll">刷新</el-button>
      </section>

      <el-tabs v-model="activeTab" class="content-card">
        <el-tab-pane label="域管理" name="domains">
          <div class="toolbar"><span>受限域账号只能直接使用存放在本域节点上的数据集，其他数据集需申请临时访问令牌；业务域数量不受 A/B/C 执行槽限制</span><el-button type="primary" icon="el-icon-plus" @click="openDomain()">新增业务域</el-button></div>
          <el-table v-loading="loading" :data="domains" border>
            <el-table-column prop="code" label="域编码" min-width="140" />
            <el-table-column prop="name" label="域名称" min-width="160" />
            <el-table-column label="对应站点" width="110"><template slot-scope="s">{{ domainSite(s.row) }}</template></el-table-column>
            <el-table-column label="包含节点" min-width="220"><template slot-scope="s">{{ domainNodeNames(s.row) }}</template></el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100"><template slot-scope="s"><el-tag :type="isEnabled(s.row) ? 'success' : 'info'">{{ isEnabled(s.row) ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="170"><template slot-scope="s"><el-button type="text" @click="openDomain(s.row)">编辑</el-button><el-button type="text" @click="toggleDomain(s.row)">{{ isEnabled(s.row) ? '停用' : '启用' }}</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="用户管理" name="users">
          <div class="toolbar"><span>域用户必须绑定一个启用的业务域</span><el-button type="primary" icon="el-icon-plus" @click="openUser()">新增用户</el-button></div>
          <el-table v-loading="loading" :data="users" border>
            <el-table-column prop="username" label="用户名" min-width="140" />
            <el-table-column label="姓名" min-width="140"><template slot-scope="s">{{ s.row.displayName || s.row.name || '—' }}</template></el-table-column>
            <el-table-column label="角色" min-width="190"><template slot-scope="s"><el-tag v-for="role in roleValues(s.row)" :key="role" size="mini" class="tag">{{ roleText(role) }}</el-tag></template></el-table-column>
            <el-table-column label="业务域" min-width="160"><template slot-scope="s">{{ userDomainName(s.row) }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template slot-scope="s"><el-tag :type="isEnabled(s.row) ? 'success' : 'info'">{{ isEnabled(s.row) ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="230"><template slot-scope="s"><el-button type="text" @click="openUser(s.row)">编辑</el-button><el-button type="text" @click="toggleUser(s.row)">{{ isEnabled(s.row) ? '停用' : '启用' }}</el-button><el-button type="text" @click="openPassword(s.row)">重置密码</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <el-dialog :title="domainForm.id ? '编辑业务域' : '新增业务域'" :visible.sync="domainDialog" width="520px">
        <el-form label-width="90px">
          <el-form-item label="域编码" required><el-input v-model.trim="domainForm.code" :disabled="!!domainForm.id" /></el-form-item>
          <el-form-item label="域名称" required><el-input v-model.trim="domainForm.name" /></el-form-item>
          <el-form-item label="对应站点">
            <el-select v-model="domainForm.siteCode" clearable placeholder="不对应站点" style="width:100%"><el-option v-for="item in siteOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
            <div class="muted site-hint">该站点的全部节点属于本域，存放在这些节点上的数据集归属本域</div>
          </el-form-item>
          <el-form-item label="说明"><el-input v-model="domainForm.description" type="textarea" /></el-form-item>
        </el-form>
        <span slot="footer"><el-button @click="domainDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!domainForm.code || !domainForm.name" @click="saveDomain">保存</el-button></span>
      </el-dialog>

      <el-dialog :title="userForm.id ? '编辑用户' : '新增用户'" :visible.sync="userDialog" width="560px">
        <el-form label-width="90px"><el-form-item label="用户名" required><el-input v-model.trim="userForm.username" :disabled="!!userForm.id" /></el-form-item><el-form-item label="姓名" required><el-input v-model.trim="userForm.displayName" /></el-form-item><el-form-item v-if="!userForm.id" label="初始密码" required><el-input v-model="userForm.password" type="password" show-password /></el-form-item><el-form-item label="角色" required><el-select v-model="userForm.roles" multiple style="width:100%"><el-option label="管理员" value="ADMIN" /><el-option label="域用户" value="DATA_OWNER" /><el-option label="审计员" value="AUDITOR" /></el-select></el-form-item><el-form-item v-if="userForm.roles.includes('DATA_OWNER')" label="业务域" required><el-select v-model="userForm.domainId" style="width:100%"><el-option v-for="item in enabledDomains" :key="item.id || item.domainId" :label="item.name" :value="item.id || item.domainId" /></el-select></el-form-item></el-form>
        <span slot="footer"><el-button @click="userDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!canSaveUser" @click="saveUser">保存</el-button></span>
      </el-dialog>

      <el-dialog title="重置密码" :visible.sync="passwordDialog" width="460px"><el-alert title="保存后该用户现有登录令牌会立即失效。" type="warning" :closable="false" show-icon /><el-input v-model="newPassword" type="password" show-password placeholder="输入不少于 10 位的新密码" class="dialog-input" /><span slot="footer"><el-button @click="passwordDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="newPassword.length < 10" @click="savePassword">确认重置</el-button></span></el-dialog>

    </el-main>
  </el-container>
</template>

<script>
import { fetchRegisteredNodes } from '@/api/registrationApi'
import { createDomain, createUser, fetchDomains, fetchUsers, resetUserPassword, updateDomain, updateUser } from '@/api/adminApi'
import { fetchAllPages } from '@/utils/dataset-catalog'

const ADMIN_TABS = ['domains', 'users']
const DOMAIN_ERRORS = { DOMAIN_SITE_TAKEN: '该站点已对应其他业务域' }
const listOf = value => Array.isArray(value) ? value : (value && Array.isArray(value.list) ? value.list : [])
const siteOf = value => value == null ? '' : String(value).trim()
const joinNames = names => names.length ? names.join('、') : '—'
const nodeName = node => node.displayName || node.k8sNodeName || node.nodeName || `节点 #${node.nodeId}`

export default {
  name: 'AdminCenter',
  data() {
    return {
      activeTab: this.$route && ADMIN_TABS.includes(this.$route.query.tab) ? this.$route.query.tab : 'domains',
      loading: false, saving: false, domains: [], users: [], nodes: [],
      domainDialog: false, domainForm: { id: null, code: '', name: '', description: '', siteCode: null },
      userDialog: false, userForm: { id: null, username: '', displayName: '', password: '', roles: [], domainId: null },
      passwordDialog: false, passwordUser: {}, newPassword: ''
    }
  },
  computed: {
    enabledDomains() { return this.domains.filter(this.isEnabled) },
    // 站点 -> 该站点的已注册节点名称
    siteNodeNames() {
      return this.nodes.reduce((sites, node) => {
        const site = siteOf(node.siteCode)
        if (site) sites[site] = (sites[site] || []).concat(nodeName(node))
        return sites
      }, {})
    },
    siteOptions() {
      const sites = Object.keys(this.siteNodeNames).sort()
      const current = siteOf(this.domainForm.siteCode)
      if (current && !sites.includes(current)) sites.push(current)
      return sites.map(site => ({ value: site, label: `${site}（${(this.siteNodeNames[site] || []).join('、') || '暂无节点'}）` }))
    },
    canSaveUser() { return Boolean(this.userForm.username && this.userForm.displayName && this.userForm.roles.length && (this.userForm.id || this.userForm.password.length >= 10) && (!this.userForm.roles.includes('DATA_OWNER') || this.userForm.domainId)) }
  },
  created() { this.loadAll() },
  methods: {
    isEnabled(item) { return item.enabled !== false && item.status !== 'DISABLED' && item.status !== 'INACTIVE' },
    roleValues(user) { return (user.roles || []).map(role => typeof role === 'string' ? role : role.code) },
    roleText(role) { return { ADMIN: '管理员', DATA_OWNER: '域用户', AUDITOR: '审计员' }[role] || role },
    userDomainId(user) { return user.domainId || (user.domain && (user.domain.id || user.domain.domainId)) },
    userDomainName(user) { return user.domainName || (user.domain && user.domain.name) || '—' },
    domainSite(domain) { return siteOf(domain.siteCode) || '—' },
    domainNodeNames(domain) { const site = siteOf(domain.siteCode); return joinNames(site ? this.siteNodeNames[site] || [] : []) },
    async loadAll() {
      this.loading = true
      try {
        const [domains, users, nodes] = await Promise.all([fetchDomains(), fetchUsers(), fetchAllPages(fetchRegisteredNodes)])
        this.domains = listOf(domains)
        this.users = listOf(users)
        this.nodes = nodes
      } catch (error) { this.$message.error(`管理数据加载失败：${error.message}`) } finally { this.loading = false }
    },
    openDomain(row = {}) { this.domainForm = { id: row.id || row.domainId || null, code: row.code || row.domainCode || '', name: row.name || '', description: row.description || '', siteCode: siteOf(row.siteCode) || null }; this.domainDialog = true },
    // 清空站点时 el-select 回填空字符串，统一以 null 提交表示解除对应。
    async saveDomain() { this.saving = true; try { const payload = { code: this.domainForm.code, name: this.domainForm.name, description: this.domainForm.description, siteCode: siteOf(this.domainForm.siteCode) || null }; if (this.domainForm.id) await updateDomain(this.domainForm.id, payload); else await createDomain(payload); this.domainDialog = false; this.$message.success('业务域已保存'); await this.loadAll() } catch (error) { this.$message.error(`保存失败：${DOMAIN_ERRORS[error.errorCode] || error.message}`) } finally { this.saving = false } },
    // 启停时带上当前站点，避免后端把缺省的 siteCode 当作解除对应。
    async toggleDomain(row) { try { await updateDomain(row.id || row.domainId, { enabled: !this.isEnabled(row), siteCode: siteOf(row.siteCode) || null }); this.$message.success('业务域状态已更新'); await this.loadAll() } catch (error) { this.$message.error(`状态更新失败：${error.message}`) } },
    openUser(row = {}) { this.userForm = { id: row.id || row.userId || null, username: row.username || '', displayName: row.displayName || row.name || '', password: '', roles: this.roleValues(row), domainId: this.userDomainId(row) || null }; this.userDialog = true },
    async saveUser() { this.saving = true; try { const payload = { username: this.userForm.username, displayName: this.userForm.displayName, roles: this.userForm.roles, domainId: this.userForm.roles.includes('DATA_OWNER') ? this.userForm.domainId : null }; if (this.userForm.id) await updateUser(this.userForm.id, payload); else await createUser({ ...payload, password: this.userForm.password }); this.userDialog = false; this.$message.success('用户已保存'); await this.loadAll() } catch (error) { this.$message.error(`保存失败：${error.message}`) } finally { this.saving = false } },
    async toggleUser(row) { try { await updateUser(row.id || row.userId, { enabled: !this.isEnabled(row) }); this.$message.success('用户状态已更新'); await this.loadAll() } catch (error) { this.$message.error(`状态更新失败：${error.message}`) } },
    openPassword(row) { this.passwordUser = row; this.newPassword = ''; this.passwordDialog = true },
    async savePassword() { this.saving = true; try { await resetUserPassword(this.passwordUser.id || this.passwordUser.userId, this.newPassword); this.passwordDialog = false; this.$message.success('密码已重置，旧令牌已失效') } catch (error) { this.$message.error(`密码重置失败：${error.message}`) } finally { this.saving = false } }
  }
}
</script>

<style scoped>
.admin-page { min-height: calc(100vh - 90px); background: #f4f7fa; }
.page-heading, .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.page-heading { margin-bottom: 16px; }.page-heading h2 { margin: 0 0 7px; color: #1f3447; }.page-heading p, .toolbar span, .muted { margin: 0; color: #7b8995; font-size: 13px; }
.content-card { padding: 8px 22px 24px; border-radius: 8px; background: #fff; box-shadow: 0 2px 9px rgba(32,55,76,.06); }
.toolbar { margin: 8px 0 16px; }.tag { margin-right: 4px; }.dialog-input { margin-top: 18px; }.site-hint { margin-top: 4px; line-height: 20px; }
@media(max-width:768px){.page-heading,.toolbar{align-items:stretch;flex-direction:column}}
</style>
