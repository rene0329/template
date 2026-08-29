import request from './axiosConfig'

const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const mutation = (url, method = 'post', data) => request({
  url,
  method,
  data,
  headers: { 'Idempotency-Key': requestId() }
})

export const discoverNodes = (clusterIds = []) => mutation('/api/v1/node-discovery-runs', 'post', { clusterIds })
export const fetchNodeCandidates = (params) => request({ url: '/api/v1/node-candidates', method: 'get', params })
export const fetchRegisteredNodes = (params) => request({ url: '/api/v1/nodes', method: 'get', params })
export const registerNode = (data) => mutation('/api/v1/nodes', 'post', data)
export const verifyNode = (id) => mutation(`/api/v1/nodes/${id}/verify`)
export const enableNode = (id) => mutation(`/api/v1/nodes/${id}/enable`)
export const disableNode = (id) => mutation(`/api/v1/nodes/${id}/disable`)

export const discoverDatasets = (nodeIds = []) => mutation('/api/v1/dataset-discovery-runs', 'post', { nodeIds })
export const fetchDatasetCandidates = (params) => request({ url: '/api/v1/dataset-candidates', method: 'get', params })
export const fetchRegisteredDatasets = (params) => request({ url: '/api/v1/datasets', method: 'get', params })
export const registerDataset = (data) => mutation('/api/v1/datasets', 'post', data)
export const verifyDataset = (id) => mutation(`/api/v1/datasets/${id}/verify`)
export const activateDataset = (id) => mutation(`/api/v1/datasets/${id}/activate`)
export const disableDataset = (id) => mutation(`/api/v1/datasets/${id}/disable`)
export const bindDatasetImage = (datasetId, runtimeImageId) => mutation(`/api/v1/datasets/${datasetId}/runtime-image`, 'put', { runtimeImageId })

export const fetchRuntimeImages = (params) => request({ url: '/api/v1/runtime-images', method: 'get', params })
export const registerRuntimeImage = (data) => mutation('/api/v1/runtime-images', 'post', data)
export const verifyRuntimeImage = (id) => mutation(`/api/v1/runtime-images/${id}/verify`)
export const activateRuntimeImage = (id) => mutation(`/api/v1/runtime-images/${id}/activate`)
export const disableRuntimeImage = (id) => mutation(`/api/v1/runtime-images/${id}/disable`)

export const createRegisteredTask = (data) => mutation('/api/v1/tasks', 'post', data)
export const preflightRegisteredTask = (data) => request({ url: '/api/v1/tasks/preflight', method: 'post', data })
