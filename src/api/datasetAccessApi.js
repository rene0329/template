import request from './axiosConfig'

const basic = (username, password) => {
  const value = `${username || ''}:${password || ''}`
  return `Basic ${window.btoa(value)}`
}

export const runDatasetAccessTest = (datasetId, data, credentials) => request({
  url: `/api/v1/datasets/${datasetId}/access-tests`,
  method: 'post',
  data,
  timeout: 900000,
  headers: { 'X-Dataset-Authorization': basic(credentials.username, credentials.password) }
})

export const fetchDatasetAccessEvents = (params = {}) => request({
  url: '/api/v1/dataset-access-events', method: 'get', params
})
