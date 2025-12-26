import request from './axiosConfig'

// 获取预测任务信息
export const getDeployModelInfo = (param) => {
  return request({
    url: '/getDeployModelInfo',
    method: 'get',
    param
  })
}
