import request from './axiosConfig'

// 获取预测任务信息
export const getPredictModelInfo = (param) => {
  return request({
    url: '/getPredictModelInfo',
    method: 'get',
    param
  })
}
