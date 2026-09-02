import request from './axiosConfig'

export const fetchStoragePolicy = (options = {}) => request({ url: '/api/v1/datasets/storage-policy', method: 'get', ...options })
export const refreshDatasetHeat = () => request({ url: '/api/v1/datasets/heat-refresh', method: 'post' })
export const previewDatasetStorage = (mode) => request({ url: '/api/v1/scheduling/storage-plans/preview', method: 'post', params: { mode }})
export const submitDatasetStorage = (data) => request({ url: '/api/v1/scheduling/storage-plans', method: 'post', data })
