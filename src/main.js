import Vue from 'vue'

import 'normalize.css/normalize.css' // A modern alternative to CSS resets

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

import '@/styles/index.scss' // global css

import App from './App'
import store from './store'
import router from './router'
import { setBaseURL } from '@/api/axiosConfig'
import { getRuntimeConfig } from '@/utils/runtime-config'

import '@/icons' // icon
import '@/permission' // permission control

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import './components/bpmn/assets/css/vue-bmpn.css' // bpmn相关
// set ElementUI lang to EN
Vue.use(ElementUI)
// 如果想要中文版 element-ui，按如下方式声明
// Vue.use(ElementUI)

Vue.config.productionTip = false
import VueHighlightJS from 'vue-highlightjs'
import 'highlight.js/styles/atom-one-dark.css'

import echarts from 'echarts'
Vue.prototype.$echarts = echarts
Vue.use(echarts)
Vue.use(VueHighlightJS)

async function startApplication() {
  // 本地 UI demo 直接使用 vue-cli 的 mock server，避免依赖真实后端。
  if (process.env.VUE_APP_DEMO_MODE !== 'true') {
    try {
      const config = await getRuntimeConfig()
      setBaseURL(config.backendUrl)
    } catch (error) {
      console.error('加载运行时配置失败，将使用内置后端地址:', error)
    }
  }

  new Vue({
    el: '#app',
    router,
    store,
    render: h => h(App)
  })
}

startApplication()
