import request from './axiosConfig'

// 获取函数信息
export const getFuncInfo = (param) => {
  return request({
    url: '/getFuncSpyInfo',
    method: 'get',
    param
  })
}

export const updateFuncInfo = (data) => {
  return request({
    url: '/updateFuncSpyInfo',
    method: 'post',
    data
  })
}

export const getFuncYaml = (data) => {
  return request({
    url: '/getFuncYaml',
    method: 'post',
    data
  })
}

export const getFuncYamlForm = (data) => {
  return request({
    url: '/getFuncYamlForm',
    method: 'post',
    data
  })
}

export const getFuncLogs = (data) => {
  return request({
    url: '/getFuncLogs',
    method: 'post',
    data
  })
}

export const updateFuncYaml = (data) => {
  return request({
    url: '/updateFuncYaml',
    method: 'post',
    data
  })
}

export const updateFuncYamlForm = (data) => {
  return request({
    url: '/updateFuncYamlForm',
    method: 'post',
    data
  })
}

// 删除函数
export const deleteFunc = (data) => {
  return request({
    url: '/deleteFunc',
    method: 'post',
    data
  })
}
