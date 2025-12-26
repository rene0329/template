import request from './axiosConfig'
// 获取所有的pods列表
export const getFuncList = (param) => {
  return request({
    url: '/global/functions',
    method: 'get',
    param
  })
}
export const getGlobalNodes = (param) => {
  return request({
    url: '/global/nodes',
    method: 'get',
    param
  })
}
export const getLog = (param) => {
  return request({
    url: '/logs?func=' + param,
    method: 'get',
    param
  })
}
// 获取函数的源码及运行调用图信息
export const getSource = (param) => {
  return request({
    url: '/source?func=' + param,
    method: 'get',
    param
  })
}
// 获取函数的静态信息
export const getStatFunc = (funcName) => {
  return request({
    url: '/static/function?func=' + funcName,
    method: 'get',
    funcName
  })
}
