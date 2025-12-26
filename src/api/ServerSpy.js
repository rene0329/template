import request from './axiosConfig'

// 获取服务器信息
export const getServerInfo = (param) => {
  return request({
    url: '/getServerSpyInfo',
    method: 'get',
    param
  })
}

// 更新服务器信息
export const updateServerInfo = (data) => {
  return request({
    url: '/updateServerSpyInfo',
    method: 'post',
    data
  })
}

// 获取nodeYaml
export const getNodeYaml = (data) => {
  return request({
    url: '/getNodeYaml',
    method: 'post',
    data
  })
}

// 获取nodeYaml表格形式
export const getNodeYamlForm = (data) => {
  return request({
    url: '/getNodeYamlForm',
    method: 'post',
    data
  })
}

// 更新nodeYaml表格形式
export const updateNodeYamlForm = (data) => {
  return request({
    url: '/updateNodeYamlForm',
    method: 'post',
    data
  })
}

// 删除nodeYaml表格形式
export const deleteNodeYamlForm = (data) => {
  return request({
    url: '/deleteNodeYamlForm',
    method: 'post',
    data
  })
}

export const getNodeRates = (data) => {
  return request({
    url: '/getNodeRates',
    method: 'post',
    data
  })
}
