import request from './axiosConfig'

// 获取部署任务信息
export const getDeployTaskInfo = (param) => {
  return request({
    url: '/getDeployTaskInfo',
    method: 'get',
    param
  })
}
