<template>
  <div class="sidebar-container" :class="{ 'has-logo': showLogo }">
    <logo v-if="showLogo" :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="variables.menuBg"
        :text-color="variables.menuText"
        :unique-opened="false"
        :active-text-color="variables.menuActiveText"
        :collapse-transition="false"
        mode="vertical"
      >
        <sidebar-item v-for="route in routes" :key="route.path" :item="route" :base-path="route.path" />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Logo from './Logo'
import SidebarItem from './SidebarItem'
import variables from '@/styles/variables.scss'

export default {
  components: { SidebarItem, Logo },
  computed: {
    ...mapGetters([
      'sidebar'
    ]),
    routes() {
      return this.$router.options.routes
    },
    activeMenu() {
      const route = this.$route
      const { meta, path } = route
      // if set path, the sidebar will highlight the path you set
      if (meta.activeMenu) {
        return meta.activeMenu
      }
      return path
    },
    showLogo() {
      return this.$store.state.settings.sidebarLogo
    },
    variables() {
      return variables
    },
    isCollapse() {
      return !this.sidebar.opened
    }
  }
}
</script>

<style lang="scss" scoped>
.sidebar-container {
  background-color: #FFFFFF;
}

.sidebar-container :deep(.el-menu) {
  background-color: #FFFFFF;
  border-right: none;
}

/* 覆盖 Element UI 默认的 56px（更高优先级，适用于所有菜单项） */
.sidebar-container :deep(.el-menu-item),
.sidebar-container :deep(.el-submenu__title),
.sidebar-container :deep(.el-menu .el-menu-item),
.sidebar-container :deep(.el-menu .el-submenu__title) {
  height: 48px !important;
  line-height: 48px !important;
}

/* Root item (submenu title) height 48px */
.sidebar-container :deep(.el-submenu__title) {
  height: 48px;
  line-height: 48px;
  font-size: 14px;
  color: #333333;
}

/* Top-level leaf item height 48px */
// .sidebar-container :deep(.el-menu > .el-menu-item) {
//   height: 48px;
//   line-height: 48px;
//   font-size: 14px;
//   color: #333333;
// }
/* 一级：有些是 el-menu 直接包 li，有些是 el-menu -> a -> li（router-link） */
.sidebar-container :deep(.el-menu > .el-menu-item),
.sidebar-container :deep(.el-menu > a > .el-menu-item) {
  height: 48px !important;
  line-height: 48px !important;
  font-size: 14px;
}

/* 一级：submenu 标题（一般不被 a 包，但也保持 48） */
.sidebar-container :deep(.el-menu > .el-submenu > .el-submenu__title) {
  height: 48px !important;
  line-height: 48px !important;
  font-size: 14px;
}

/* Child item height 40px */
.sidebar-container :deep(.el-submenu .el-menu-item) {
  height: 40px;
  line-height: 40px;
  font-size: 14px;
  color: #333333;
}

/* hover（可留你原来的） */
.sidebar-container :deep(.el-menu-item:hover),
.sidebar-container :deep(.el-submenu__title:hover) {
  background-color: #f5f7fa;
  color: #202231;
}

/* ✅ 1) 父级：只变绿字，不要灰底/不要绿条 */
.sidebar-container :deep(.el-submenu.is-active > .el-submenu__title),
.sidebar-container :deep(.el-submenu.is-opened > .el-submenu__title) {
  color: #0c8357 !important;
  background-color: transparent !important;
}

/* ✅ 2) 子级（叶子菜单）：灰底 + 绿字 + 右侧绿条 */
.sidebar-container :deep(.el-menu-item.is-active) {
  background-color: #f0f2f5 !important;
  color: #0c8357 !important;
  position: relative;
}

/* 如果内部是 router-link/a，确保整行也上灰底（非常关键） */
.sidebar-container :deep(.el-menu-item.is-active > a),
.sidebar-container :deep(.el-menu-item.is-active a) {
  display: block;
  width: 100%;
  height: 100%;
  background-color: #f0f2f5 !important;
  color: #0c8357 !important;
}

/* 右侧绿条：占满整行高度的矩形条 */
.sidebar-container :deep(.el-menu-item.is-active::after) {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #497aae 0%, #4ec58c 100%);
  border-radius: 0;
}

/* Hover on active item: use hover gradient per spec */
.sidebar-container :deep(.el-menu-item.is-active:hover::after) {
  background: linear-gradient(180deg, #335f8d 0%, #3da371 100%);
}

/* ✅ 3) 明确禁止父级出现右侧绿条（防止残留样式影响） */
.sidebar-container :deep(.el-submenu.is-active > .el-submenu__title::after),
.sidebar-container :deep(.el-submenu.is-opened > .el-submenu__title::after) {
  content: none !important;
}

</style>


