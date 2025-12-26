import request from './axiosConfig'

// 获取伸缩任务信息
export const getScalingModelInfo = (param) => {
  return request({
    url: '/getScalingModelInfo',
    method: 'get',
    param
  })
}
