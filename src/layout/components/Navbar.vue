<template>
  <div class="navbar">
    <div class="bottom-bar">
      <hamburger :is-active="sidebar.opened" class="hamburger-container" style="padding: 0px 10px;" @toggleClick="toggleSideBar" />

      <breadcrumb class="breadcrumb-container" />

      <div class="right-menu">
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Breadcrumb from '@/components/Breadcrumb'
import Hamburger from '@/components/Hamburger'

export default {
  components: {
    Breadcrumb,
    Hamburger
  },
  computed: {
    ...mapGetters([
      'sidebar',
      'avatar',
      'name'
    ])
  },
  methods: {
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    async logout() {
      await this.$store.dispatch('user/logout')
      this.$router.push(`/login?redirect=${this.$route.fullPath}`)
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  position: relative;

  .bottom-bar {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    background: #f7f8fc;
    box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
  }

  .hamburger-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    cursor: pointer;
    transition: background .3s;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: rgba(0, 0, 0, .025);
    }
  }
  .hamburger-container :deep(svg.hamburger) {
  width: 30px;
  height: 30px;
  display: block;
  }


  .breadcrumb-container {
    flex: 1;
    margin-left: 0px;
  }

  .right-menu {
    display: flex;
    align-items: center;
    height: 100%;
    line-height: 40px;

    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #5a5e66;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background .3s;

        &:hover {
          background: rgba(0, 0, 0, .025);
        }
      }
    }
  }
}
</style>
