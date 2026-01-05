/* 对axios进行二次封装 */
import axios from 'axios'
// 引入进度条 start 进度条开始  done进度条结束
import nprogress from 'nprogress'
// 引入 进度条样式
import 'nprogress/nprogress.css'

// 1. 利用axios对象的方法create方法去创建一个axios实例
// request就是axios,只不过稍微配置一下
const request = axios.create({
  // 基础路径：发请求的时候，路径中会带有api 这里改成我们的地址
  // baseURL: 'http://10.60.150.74:5010',
  baseURL: 'http://10.15.16.40:34568', // 本地测试使用
  // 代表请求超时的时间为50s --20230803修改-何诗锟--很重要
  // 延长了请求超时的时间，因为工作流创建比较缓慢 --20230815修改-康力
  timeout: 120000
})

// 提取baseURL
export const baseURL = request.defaults.baseURL

// 配置请求拦截器,在请求发出去之前，拦截器可以监测到，可以在请求发出之前做一些事情
request.interceptors.request.use((config) => {
  // config 是一个配置对象，对象里有一个属性很重要，就是header请求头
  nprogress.start()
  return config
})

// 响应拦截器
request.interceptors.response.use(
  (res) => {
    nprogress.done()
    const payload = res.data // 期望格式 { code, msg, data }
    if (payload === undefined) {
      return Promise.reject(new Error('Empty response'))
    }
    const { code, msg, data } = payload
    if (code === 0) {
      // 成功时返回 data，分页场景直接是 { list, total, pageNum, pageSize }
      return data
    }
    // 非 0 认为失败，抛出带 msg 的错误，方便 UI 提示
    return Promise.reject(new Error(msg || 'Request failed'))
  },
  (error) => {
    nprogress.done()
    return Promise.reject(error) // 返回一个失败的promise,会进入到axios的catch中
    // 20230803修改-何诗锟--很重要
  }
)

export default request
