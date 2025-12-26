import request from './axiosConfig'

// 获取服务器信息
export const getClusterSpyInfo = (param) => {
  return request({
    url: '/getClusterSpyInfo',
    method: 'get',
    param
  })
}

// 更新服务器信息
export const updateClusterSpyInfo = (data) => {
  return request({
    url: '/updateClusterSpyInfo',
    method: 'post',
    data
  })
}
