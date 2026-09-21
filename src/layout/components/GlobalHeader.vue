<template>
  <header class="global-header">
    <div class="title">虚拟数据中心原位调度子系统</div>
    <div class="meta">
      <el-button class="server-button" type="text" @click="openBackendSettings">
        <i class="el-icon-setting" /> 服务器
      </el-button>
      <el-button v-if="isAdmin" class="switch-button" type="text" @click="openUserSwitcher">
        <i class="el-icon-user" /> 切换用户
      </el-button>
      <el-tag v-if="impersonated" size="mini" effect="dark" type="warning">管理员只读视角</el-tag>
      <el-button v-if="impersonated" class="switch-button" type="text" :loading="returning" @click="returnToAdmin">
        <i class="el-icon-back" /> 返回 {{ actorUsername || '管理员' }}
      </el-button>
      <el-tag v-for="role in roles" :key="role" size="mini" effect="dark" type="success">{{ roleText(role) }}</el-tag>
      <span v-if="domain" class="domain"><i class="el-icon-office-building" /> {{ domain.name || domain.domainName || domain.id }}</span>
      <img v-if="avatar" :src="avatar" alt="avatar" class="avatar">
      <span class="name">{{ name || username }}</span>
      <el-button class="logout-button" type="text" @click="logout"><i class="el-icon-switch-button" /> 退出</el-button>
    </div>
    <backend-settings ref="backendSettings" />
    <el-dialog title="切换普通用户视角" :visible.sync="switchDialogVisible" width="520px" append-to-body>
      <el-alert title="切换后仅可查看该用户页面，不能审批、修改数据或读取隐私计算明文结果。" type="warning" :closable="false" show-icon />
      <el-form label-width="90px" class="switch-form">
        <el-form-item label="目标用户" required>
          <el-select v-model="targetUserId" filterable placeholder="选择已启用的普通用户" style="width:100%">
            <el-option v-for="item in switchableUsers" :key="item.id" :value="item.id" :label="userLabel(item)" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="switchDialogVisible=false">取消</el-button>
        <el-button type="primary" :disabled="!targetUserId" :loading="switching" @click="switchUser">切换视角</el-button>
      </span>
    </el-dialog>
  </header>
</template>

<script>
import { mapGetters } from 'vuex'
import BackendSettings from '@/components/BackendSettings'
import { fetchUsers } from '@/api/adminApi'
export default {
  name: 'GlobalHeader',
  components: { BackendSettings },
  data() {
    return { switchDialogVisible: false, switchableUsers: [], targetUserId: null, switching: false, returning: false }
  },
  computed: {
    ...mapGetters(['avatar', 'name', 'username', 'roles', 'domain', 'impersonated', 'actorUsername']),
    isAdmin() { return this.roles.includes('ADMIN') && !this.impersonated }
  },
  methods: {
    openBackendSettings() {
      this.$refs.backendSettings.open()
    },
    roleText(role) {
      return { ADMIN: '管理员', DATA_OWNER: '数据持有者', AUDITOR: '审计员' }[role] || role
    },
    userLabel(user) {
      const domain = user.domainName || user.domainCode || '无业务域'
      return `${user.displayName || user.username}（${user.username} · ${domain}）`
    },
    async openUserSwitcher() {
      try {
        const rows = await fetchUsers()
        this.switchableUsers = (Array.isArray(rows) ? rows : []).filter(item => item.enabled && !(item.roles || []).includes('ADMIN'))
        this.targetUserId = null
        this.switchDialogVisible = true
      } catch (error) {
        this.$message.error(`读取用户失败：${error.message || error}`)
      }
    },
    async switchUser() {
      if (!this.targetUserId) return
      this.switching = true
      try {
        await this.$store.dispatch('user/switchUser', this.targetUserId)
        this.switchDialogVisible = false
        await this.$router.push('/workspace').catch(() => {})
        this.$message.success('已切换为普通用户只读视角')
      } catch (error) {
        this.$message.error(`切换失败：${error.message || error}`)
      } finally {
        this.switching = false
      }
    },
    async returnToAdmin() {
      this.returning = true
      try {
        await this.$store.dispatch('user/exitUserSwitch')
        await this.$router.push('/workspace').catch(() => {})
        this.$message.success('已返回管理员身份')
      } catch (error) {
        this.$message.error(`返回管理员失败：${error.message || error}`)
      } finally {
        this.returning = false
      }
    },
    async logout() {
      await this.$store.dispatch('user/logout')
      this.$router.push('/login')
    }
  }
}
</script>

<style lang="scss" scoped>
.global-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #202231; /* 深色顶栏 */
  color: #fff;
  z-index: 10;
  .title { font-weight: 600; font-size: 16px; }
  .meta { display: flex; align-items: center; gap: 8px; }
  .server-button { color: #fff; margin-right: 10px; }
  .server-button:hover { color: #4ec58c; }
  .switch-button { color: #fff; margin-left: 2px; }
  .switch-button:hover { color: #4ec58c; }
  .logout-button { color: #fff; margin-left: 4px; }
  .logout-button:hover { color: #4ec58c; }
  .domain { color: #d7e2ea; font-size: 13px; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; }
  .name { font-size: 14px; }
}
.switch-form { margin-top: 20px; }
</style>
