import request from './axiosConfig'

// 获取模板信息
export const getTemplateInfo = (param) => {
  return request({
    url: '/getTemplateInfo',
    method: 'get',
    param
  })
}

export const updateTemplateInfo = (data) => {
  return request({
    url: '/updateTemplateInfo',
    method: 'get',
    data
  })
}
