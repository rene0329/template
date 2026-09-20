<template>
  <div class="privacy-session">
    <el-button class="session-button" type="text" @click="visible = true">
      <i class="el-icon-lock" /> 协同认证
      <span v-if="connectedCount" class="session-count">{{ connectedCount }}</span>
    </el-button>
    <el-drawer
      title="参与方内存会话"
      :visible.sync="visible"
      direction="rtl"
      size="380px"
      append-to-body
    >
      <div class="drawer-body">
        <el-alert
          title="凭据仅保存在当前页面内存中，刷新页面或退出登录后自动清空。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form label-position="top" class="credential-form">
          <el-form-item label="当前操作身份">
            <el-radio-group :value="activeParty" @input="setActiveParty">
              <el-radio-button v-for="party in parties" :key="party" :label="party">参与方 {{ party }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-for="party in parties" :key="party" :label="`参与方 ${party} 凭据`">
            <el-input
              :value="secrets[party]"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="`输入 ${party} 的临时 secret`"
              @input="setSecret(party, $event)"
            >
              <el-tag slot="append" size="mini" :type="secrets[party] ? 'success' : 'info'">
                {{ secrets[party] ? '已连接' : '未连接' }}
              </el-tag>
            </el-input>
          </el-form-item>
        </el-form>
        <div class="drawer-actions">
          <el-button @click="clear">清空全部凭据</el-button>
          <el-button type="primary" @click="visible = false">完成</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
export default {
  name: 'PrivacySessionPanel',
  data: () => ({ visible: false, parties: ['A', 'B', 'C'] }),
  computed: {
    activeParty() { return this.$store.state.privacySession.activeParty },
    secrets() { return this.$store.state.privacySession.secrets },
    connectedCount() { return this.$store.getters['privacySession/connectedParties'].length }
  },
  methods: {
    setActiveParty(partyId) { this.$store.dispatch('privacySession/setActiveParty', partyId) },
    setSecret(partyId, secret) { this.$store.dispatch('privacySession/setSecret', { partyId, secret }) },
    clear() { this.$store.dispatch('privacySession/clear') }
  }
}
</script>

<style lang="scss" scoped>
.privacy-session { display: inline-flex; align-items: center; }
.session-button { color: #fff; }
.session-button:hover { color: #4ec58c; }
.session-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 4px;
  border-radius: 50%;
  color: #202231;
  background: #4ec58c;
  font-size: 11px;
  font-weight: 700;
}
.drawer-body { padding: 0 22px 22px; }
.credential-form { margin-top: 22px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 26px; }
</style>
