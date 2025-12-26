import request from './axiosConfig'

// 获取调度任务信息
export const getSchedulingModelInfo = (param) => {
  return request({
    url: '/getSchedulingModelInfo',
    method: 'get',
    param
  })
}
