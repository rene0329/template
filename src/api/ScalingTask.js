import request from './axiosConfig'

// 获取伸缩任务信息
export const getScalingTaskInfo = (param) => {
  return request({
    url: '/getScalingTaskInfo',
    method: 'get',
    param
  })
}
