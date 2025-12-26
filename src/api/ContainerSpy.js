import request from './axiosConfig'

// 获取所有的容器信息
export const getContainerInfo = (param) => {
  return request({
    url: '/getContainerSpyInfo',
    method: 'get',
    param
  })
}

// 更新容器信息
export const updateContainerInfo = (data) => {
  return request({
    url: '/updateContainerSpyInfo',
    method: 'post',
    data
  })
}

export const getPodLogs = (data) => {
  return request({
    url: '/getPodLogs',
    method: 'post',
    data
  })
}

export const getPodRates = (data) => {
  return request({
    url: '/getPodInstRates',
    method: 'post',
    data
  })
}

export const getPodYaml = (data) => {
  return request({
    url: '/getPodYaml',
    method: 'post',
    data
  })
}

export const getPodYamlForm = (data) => {
  return request({
    url: '/getPodYamlForm',
    method: 'post',
    data
  })
}

export const updatePodYamlForm = (data) => {
  return request({
    url: '/updatePodYamlForm',
    method: 'post',
    data
  })
}

// 删除labels等配置项专用
// 目前只有labels
export const deletePodYamlForm = (data) => {
  return request({
    url: '/deletePodYamlForm',
    method: 'post',
    data
  })
}

