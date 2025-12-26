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
  baseURL: 'http://127.0.0.1:5000', // 本地测试使用
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
request.interceptors.response.use((res) => {
  // 响应成功的回调函数，服务器响应数据回来以后，可以做一些事情
  nprogress.done()
  return res.data
}, (error) => {
  // 响应失败的回调函数
  return Promise.reject(error) // 返回一个失败的promise,会进入到axios的catch中
  // 20230803修改-何诗锟--很重要
})

export default request
