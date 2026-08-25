<template>
  <header class="global-header">
    <div class="title">虚拟数据中心原位调度子系统</div>
    <div class="meta">
      <el-button class="server-button" type="text" @click="openBackendSettings">
        <i class="el-icon-setting" /> 服务器
      </el-button>
      <img v-if="avatar" :src="avatar" alt="avatar" class="avatar">
      <span class="name">{{ name }}</span>
    </div>
    <backend-settings ref="backendSettings" />
  </header>
</template>

<script>
import { mapGetters } from 'vuex'
import BackendSettings from '@/components/BackendSettings'
export default {
  name: 'GlobalHeader',
  components: { BackendSettings },
  computed: {
    ...mapGetters(['avatar', 'name'])
  },
  methods: {
    openBackendSettings() {
      this.$refs.backendSettings.open()
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
  .avatar { width: 32px; height: 32px; border-radius: 50%; }
  .name { font-size: 14px; }
}
</style>
