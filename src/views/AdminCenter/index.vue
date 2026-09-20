<template>
  <el-container class="admin-page">
    <el-main>
      <section class="page-heading">
        <div><h2>系统管理</h2><p>管理协同业务域、账号角色和数据持有者。已被任务引用的记录只能停用。</p></div>
        <el-button icon="el-icon-refresh" :loading="loading" @click="loadAll">刷新</el-button>
      </section>

      <el-tabs v-model="activeTab" class="content-card" @tab-click="onTabClick">
        <el-tab-pane label="域管理" name="domains">
          <div class="toolbar"><span>业务域数量不受 A/B/C 执行槽限制</span><el-button type="primary" icon="el-icon-plus" @click="openDomain()">新增业务域</el-button></div>
          <el-table v-loading="loading" :data="domains" border>
            <el-table-column prop="code" label="域编码" min-width="160" />
            <el-table-column prop="name" label="域名称" min-width="180" />
            <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
            <el-table-column label="状态" width="100"><template slot-scope="s"><el-tag :type="isEnabled(s.row) ? 'success' : 'info'">{{ isEnabled(s.row) ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="170"><template slot-scope="s"><el-button type="text" @click="openDomain(s.row)">编辑</el-button><el-button type="text" @click="toggleDomain(s.row)">{{ isEnabled(s.row) ? '停用' : '启用' }}</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="用户管理" name="users">
          <div class="toolbar"><span>数据持有者必须绑定一个启用的业务域</span><el-button type="primary" icon="el-icon-plus" @click="openUser()">新增用户</el-button></div>
          <el-table v-loading="loading" :data="users" border>
            <el-table-column prop="username" label="用户名" min-width="140" />
            <el-table-column label="姓名" min-width="140"><template slot-scope="s">{{ s.row.displayName || s.row.name || '—' }}</template></el-table-column>
            <el-table-column label="角色" min-width="190"><template slot-scope="s"><el-tag v-for="role in roleValues(s.row)" :key="role" size="mini" class="tag">{{ roleText(role) }}</el-tag></template></el-table-column>
            <el-table-column label="业务域" min-width="160"><template slot-scope="s">{{ userDomainName(s.row) }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template slot-scope="s"><el-tag :type="isEnabled(s.row) ? 'success' : 'info'">{{ isEnabled(s.row) ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="230"><template slot-scope="s"><el-button type="text" @click="openUser(s.row)">编辑</el-button><el-button type="text" @click="toggleUser(s.row)">{{ isEnabled(s.row) ? '停用' : '启用' }}</el-button><el-button type="text" @click="openPassword(s.row)">重置密码</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="数据归属" name="datasets">
          <div class="toolbar"><span>未分配持有者的数据不能用于隐私计算</span><el-input v-model="datasetQuery" clearable placeholder="搜索数据集" class="search" @keyup.enter.native="loadDatasets" /><el-button @click="loadDatasets">查询</el-button></div>
          <el-table v-loading="loading" :data="datasets" border>
            <el-table-column prop="datasetId" label="ID" width="80" />
            <el-table-column label="数据集" min-width="210"><template slot-scope="s"><strong>{{ s.row.name || s.row.datasetCode }}</strong><div class="muted">{{ s.row.datasetCode }} · {{ s.row.version }}</div></template></el-table-column>
            <el-table-column label="业务域" min-width="160"><template slot-scope="s">{{ datasetDomainName(s.row) }}</template></el-table-column>
            <el-table-column label="持有者" min-width="160"><template slot-scope="s"><el-tag :type="s.row.ownerUserId ? 'success' : 'warning'">{{ s.row.ownerDisplayName || s.row.ownerUsername || '未分配持有者' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="120"><template slot-scope="s"><el-button type="text" @click="openOwner(s.row)">调整归属</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <el-dialog :title="domainForm.id ? '编辑业务域' : '新增业务域'" :visible.sync="domainDialog" width="520px">
        <el-form label-width="90px"><el-form-item label="域编码" required><el-input v-model.trim="domainForm.code" :disabled="!!domainForm.id" /></el-form-item><el-form-item label="域名称" required><el-input v-model.trim="domainForm.name" /></el-form-item><el-form-item label="说明"><el-input v-model="domainForm.description" type="textarea" /></el-form-item></el-form>
        <span slot="footer"><el-button @click="domainDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!domainForm.code || !domainForm.name" @click="saveDomain">保存</el-button></span>
      </el-dialog>

      <el-dialog :title="userForm.id ? '编辑用户' : '新增用户'" :visible.sync="userDialog" width="560px">
        <el-form label-width="90px"><el-form-item label="用户名" required><el-input v-model.trim="userForm.username" :disabled="!!userForm.id" /></el-form-item><el-form-item label="姓名" required><el-input v-model.trim="userForm.displayName" /></el-form-item><el-form-item v-if="!userForm.id" label="初始密码" required><el-input v-model="userForm.password" type="password" show-password /></el-form-item><el-form-item label="角色" required><el-select v-model="userForm.roles" multiple style="width:100%"><el-option label="管理员" value="ADMIN" /><el-option label="数据持有者" value="DATA_OWNER" /><el-option label="审计员" value="AUDITOR" /></el-select></el-form-item><el-form-item v-if="userForm.roles.includes('DATA_OWNER')" label="业务域" required><el-select v-model="userForm.domainId" style="width:100%"><el-option v-for="item in enabledDomains" :key="item.id || item.domainId" :label="item.name" :value="item.id || item.domainId" /></el-select></el-form-item></el-form>
        <span slot="footer"><el-button @click="userDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!canSaveUser" @click="saveUser">保存</el-button></span>
      </el-dialog>

      <el-dialog title="重置密码" :visible.sync="passwordDialog" width="460px"><el-alert title="保存后该用户现有登录令牌会立即失效。" type="warning" :closable="false" show-icon /><el-input v-model="newPassword" type="password" show-password placeholder="输入不少于 10 位的新密码" class="dialog-input" /><span slot="footer"><el-button @click="passwordDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="newPassword.length < 10" @click="savePassword">确认重置</el-button></span></el-dialog>

      <el-dialog title="调整数据归属" :visible.sync="ownerDialog" width="520px"><p class="dataset-title">{{ ownerDataset.name || ownerDataset.datasetCode }}</p><el-form label-width="90px"><el-form-item label="持有者" required><el-select v-model="ownerUserId" filterable style="width:100%"><el-option-group v-for="group in ownerGroups" :key="group.id" :label="group.name"><el-option v-for="user in group.users" :key="user.id || user.userId" :value="user.id || user.userId" :label="`${user.displayName || user.name || user.username}（${user.username}）`" /></el-option-group></el-select></el-form-item></el-form><span slot="footer"><el-button @click="ownerDialog=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!ownerUserId" @click="saveOwner">保存</el-button></span></el-dialog>
    </el-main>
  </el-container>
</template>

<script>
import { fetchRegisteredDatasets } from '@/api/registrationApi'
import { assignDatasetOwner, createDomain, createUser, fetchDomains, fetchUsers, resetUserPassword, updateDomain, updateUser } from '@/api/adminApi'

const listOf = value => Array.isArray(value) ? value : (value && Array.isArray(value.list) ? value.list : [])

export default {
  name: 'AdminCenter',
  data() {
    return {
      activeTab: (this.$route && this.$route.meta && this.$route.meta.adminTab) || 'domains',
      loading: false, saving: false, domains: [], users: [], datasets: [], datasetQuery: '',
      domainDialog: false, domainForm: { id: null, code: '', name: '', description: '' },
      userDialog: false, userForm: { id: null, username: '', displayName: '', password: '', roles: [], domainId: null },
      passwordDialog: false, passwordUser: {}, newPassword: '',
      ownerDialog: false, ownerDataset: {}, ownerUserId: null
    }
  },
  computed: {
    enabledDomains() { return this.domains.filter(this.isEnabled) },
    canSaveUser() { return Boolean(this.userForm.username && this.userForm.displayName && this.userForm.roles.length && (this.userForm.id || this.userForm.password.length >= 10) && (!this.userForm.roles.includes('DATA_OWNER') || this.userForm.domainId)) },
    ownerGroups() {
      return this.enabledDomains.map(domain => ({
        id: domain.id || domain.domainId,
        name: domain.name,
        users: this.users.filter(user => this.isEnabled(user) && this.roleValues(user).includes('DATA_OWNER') && String(this.userDomainId(user)) === String(domain.id || domain.domainId))
      })).filter(group => group.users.length)
    }
  },
  watch: { '$route.meta.adminTab'(value) { if (value) this.activeTab = value } },
  created() { this.loadAll() },
  methods: {
    isEnabled(item) { return item.enabled !== false && item.status !== 'DISABLED' && item.status !== 'INACTIVE' },
    roleValues(user) { return (user.roles || []).map(role => typeof role === 'string' ? role : role.code) },
    roleText(role) { return { ADMIN: '管理员', DATA_OWNER: '数据持有者', AUDITOR: '审计员' }[role] || role },
    userDomainId(user) { return user.domainId || (user.domain && (user.domain.id || user.domain.domainId)) },
    userDomainName(user) { return user.domainName || (user.domain && user.domain.name) || '—' },
    datasetDomainName(dataset) { return dataset.ownerDomainName || (dataset.ownerDomain && dataset.ownerDomain.name) || '未分配' },
    async loadAll() {
      this.loading = true
      try {
        const [domains, users] = await Promise.all([fetchDomains(), fetchUsers()])
        this.domains = listOf(domains)
        this.users = listOf(users)
        await this.loadDatasets(true)
      } catch (error) { this.$message.error(`管理数据加载失败：${error.message}`) } finally { this.loading = false }
    },
    async loadDatasets(nested = false) {
      if (!nested) this.loading = true
      try { this.datasets = listOf(await fetchRegisteredDatasets({ page: 1, pageSize: 1000, query: this.datasetQuery })) } catch (error) { this.$message.error(`数据集加载失败：${error.message}`) } finally { if (!nested) this.loading = false }
    },
    onTabClick() {
      const path = { domains: '/admin/domains', users: '/admin/users', datasets: '/admin/dataset-owners' }[this.activeTab]
      if (path && this.$route.path !== path) this.$router.push(path)
    },
    openDomain(row = {}) { this.domainForm = { id: row.id || row.domainId || null, code: row.code || row.domainCode || '', name: row.name || '', description: row.description || '' }; this.domainDialog = true },
    async saveDomain() { this.saving = true; try { const payload = { code: this.domainForm.code, name: this.domainForm.name, description: this.domainForm.description }; if (this.domainForm.id) await updateDomain(this.domainForm.id, payload); else await createDomain(payload); this.domainDialog = false; this.$message.success('业务域已保存'); await this.loadAll() } catch (error) { this.$message.error(`保存失败：${error.message}`) } finally { this.saving = false } },
    async toggleDomain(row) { try { await updateDomain(row.id || row.domainId, { enabled: !this.isEnabled(row) }); this.$message.success('业务域状态已更新'); await this.loadAll() } catch (error) { this.$message.error(`状态更新失败：${error.message}`) } },
    openUser(row = {}) { this.userForm = { id: row.id || row.userId || null, username: row.username || '', displayName: row.displayName || row.name || '', password: '', roles: this.roleValues(row), domainId: this.userDomainId(row) || null }; this.userDialog = true },
    async saveUser() { this.saving = true; try { const payload = { username: this.userForm.username, displayName: this.userForm.displayName, roles: this.userForm.roles, domainId: this.userForm.roles.includes('DATA_OWNER') ? this.userForm.domainId : null }; if (this.userForm.id) await updateUser(this.userForm.id, payload); else await createUser({ ...payload, password: this.userForm.password }); this.userDialog = false; this.$message.success('用户已保存'); await this.loadAll() } catch (error) { this.$message.error(`保存失败：${error.message}`) } finally { this.saving = false } },
    async toggleUser(row) { try { await updateUser(row.id || row.userId, { enabled: !this.isEnabled(row) }); this.$message.success('用户状态已更新'); await this.loadAll() } catch (error) { this.$message.error(`状态更新失败：${error.message}`) } },
    openPassword(row) { this.passwordUser = row; this.newPassword = ''; this.passwordDialog = true },
    async savePassword() { this.saving = true; try { await resetUserPassword(this.passwordUser.id || this.passwordUser.userId, this.newPassword); this.passwordDialog = false; this.$message.success('密码已重置，旧令牌已失效') } catch (error) { this.$message.error(`密码重置失败：${error.message}`) } finally { this.saving = false } },
    openOwner(row) { this.ownerDataset = row; this.ownerUserId = row.ownerUserId || null; this.ownerDialog = true },
    async saveOwner() { this.saving = true; try { await assignDatasetOwner(this.ownerDataset.datasetId, this.ownerUserId); this.ownerDialog = false; this.$message.success('数据归属已更新'); await this.loadDatasets() } catch (error) { this.$message.error(`归属更新失败：${error.message}`) } finally { this.saving = false } }
  }
}
</script>

<style scoped>
.admin-page { min-height: calc(100vh - 90px); background: #f4f7fa; }
.page-heading, .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.page-heading { margin-bottom: 16px; }.page-heading h2 { margin: 0 0 7px; color: #1f3447; }.page-heading p, .toolbar span, .muted { margin: 0; color: #7b8995; font-size: 13px; }
.content-card { padding: 8px 22px 24px; border-radius: 8px; background: #fff; box-shadow: 0 2px 9px rgba(32,55,76,.06); }
.toolbar { margin: 8px 0 16px; }.toolbar .search { width: 280px; margin-left: auto; }.tag { margin-right: 4px; }.dialog-input { margin-top: 18px; }.dataset-title { font-weight: 600; color: #334a5d; }
@media(max-width:768px){.page-heading,.toolbar{align-items:stretch;flex-direction:column}.toolbar .search{width:100%;margin-left:0}}
</style>
