import request from './axiosConfig'

// 获取预测任务信息
export const getPredictTaskInfo = (param) => {
  return request({
    url: '/getPredictTaskInfo',
    method: 'get',
    param
  })
}
