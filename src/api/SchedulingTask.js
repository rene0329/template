import request from './axiosConfig'

// 获取调度任务信息
export const getSchedulingTaskInfo = (param) => {
  return request({
    url: '/getSchedulingTaskInfo',
    method: 'get',
    param
  })
}
