<template>
  <header class="global-header">
    <div class="title">虚拟数据中心原位调度子系统</div>
    <div class="meta">
      <img v-if="avatar" :src="avatar" alt="avatar" class="avatar" />
      <span class="name">{{ name }}</span>
    </div>
  </header>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  name: 'GlobalHeader',
  computed: {
    ...mapGetters(['avatar', 'name'])
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
  .avatar { width: 32px; height: 32px; border-radius: 50%; }
  .name { font-size: 14px; }
}
</style>
