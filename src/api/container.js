import request from './axiosConfig'
// 获取所有的pods列表
export const getContainerList = (param) => {
  return request({
    url: '/global/pods',
    method: 'get',
    param
  })
}
// 获取所有的nodes列表
export const getNodeList = (param) => {
  return request({
    url: '/global/nodes',
    method: 'get',
    param
  })
}
// 获取指定node的所有函数列表
export const getNodeContainers = (param) => {
  console.log(param)
  return request({
    url: '/dynamic/getPodsFromNode?node=' + param.node,
    method: 'get',
    param
  })
}

// 获取指定pod的cpu占用率与内存占用率
export const getCpuMemRate = (param) => {
  return request({
    url: '/dynamic/pod?pod=' + param.pod_name,
    method: 'get',
    param
  })
}

// 获取指定node的各类速率数据
export const getNodeRate = (param) => {
  return request({
    url: '/dynamic/node?node=' + param.node,
    method: 'get',
    param
  })
}

// 获取

