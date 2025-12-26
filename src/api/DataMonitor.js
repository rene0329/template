import request from './axiosConfig'

export const getDataMonitorInfo = (params) => {
  return request({
    url: '/getDataMonitorInfo',
    method: 'get',
    params
  })
}

export const updateDataMonitorInfo = (params) => {
  return request({
    url: '/updateDataMonitorInfo',
    method: 'get',
    params
  })
}

export const createDataMonitorData = (data) => {
  return request({
    url: '/createDataMonitorData',
    method: 'post',
    data
  })
}

export const deleteDataMonitorData = (data) => {
  return request({
    url: '/deleteDataMonitorData',
    method: 'post',
    data
  })
}

export const transferDataMonitorData = (data) => {
  return request({
    url: '/transferDataMonitorData',
    method: 'post',
    data
  })
}

export const getDuplicateDataMonitorData = (data) => {
  return request({
    url: '/getDuplicateDataMonitorData',
    method: 'post',
    data
  })
}

export const getDataPosition = (params) => {
  return request({
    url: '/getDataMonitorPosition',
    method: 'get',
    params
  })
}
