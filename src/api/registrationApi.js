import request from './axiosConfig'

export const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const mutation = (url, method = 'post', data, idempotencyKey = requestId()) => request({
  url,
  method,
  data,
  headers: { 'Idempotency-Key': idempotencyKey }
})

export const discoverNodes = (clusterIds = []) => mutation('/api/v1/node-discovery-runs', 'post', { clusterIds })
export const fetchNodeCandidates = (params) => request({ url: '/api/v1/node-candidates', method: 'get', params })
export const fetchRegisteredNodes = (params, options = {}) => request({ url: '/api/v1/nodes', method: 'get', params, ...options })
export const updateRegisteredNode = (id, data) => mutation(`/api/v1/nodes/${id}`, 'patch', data)
export const registerNode = (data) => mutation('/api/v1/nodes', 'post', data)
export const verifyNode = (id) => mutation(`/api/v1/nodes/${id}/verify`)
export const enableNode = (id) => mutation(`/api/v1/nodes/${id}/enable`)
export const disableNode = (id) => mutation(`/api/v1/nodes/${id}/disable`)
export const unregisterNode = (id) => mutation(`/api/v1/nodes/${id}`, 'delete')

export const discoverDatasets = (nodeIds = []) => mutation('/api/v1/dataset-discovery-runs', 'post', { nodeIds })
export const fetchDatasetCandidates = (params) => request({ url: '/api/v1/dataset-candidates', method: 'get', params })
export const fetchRegisteredDatasets = (params, options = {}) => request({ url: '/api/v1/datasets', method: 'get', params, ...options })
export const fetchRegisteredDataset = (id, options = {}) => request({ url: `/api/v1/datasets/${id}`, method: 'get', ...options })
export const registerDataset = (data) => mutation('/api/v1/datasets', 'post', data)
export const uploadAndRegisterDataset = (data, onUploadProgress) => request({
  url: '/api/v1/datasets/upload',
  method: 'post',
  data,
  timeout: 60 * 60 * 1000,
  headers: { 'Idempotency-Key': requestId() },
  onUploadProgress
})
export const verifyDataset = (id) => mutation(`/api/v1/datasets/${id}/verify`)
export const fetchDatasetReplicas = (datasetId, options = {}) => request({
  url: `/api/v1/datasets/${datasetId}/replicas`, method: 'get', ...options
})
export const addDatasetReplica = (datasetId, candidateId) => mutation(
  `/api/v1/datasets/${datasetId}/replicas`, 'post', { candidateId }
)
export const removeDatasetReplica = (datasetId, replicaId) => mutation(
  `/api/v1/datasets/${datasetId}/replicas/${replicaId}`, 'delete'
)
export const activateDataset = (id) => mutation(`/api/v1/datasets/${id}/activate`)
export const disableDataset = (id) => mutation(`/api/v1/datasets/${id}/disable`)
export const unregisterDataset = (id) => mutation(`/api/v1/datasets/${id}`, 'delete')
export const bindDatasetImage = (datasetId, runtimeImageId) => mutation(`/api/v1/datasets/${datasetId}/runtime-image`, 'put', { runtimeImageId })

export const fetchRuntimeImages = (params) => request({ url: '/api/v1/runtime-images', method: 'get', params })
export const registerRuntimeImage = (data) => mutation('/api/v1/runtime-images', 'post', data)
export const verifyRuntimeImage = (id) => mutation(`/api/v1/runtime-images/${id}/verify`)
export const activateRuntimeImage = (id) => mutation(`/api/v1/runtime-images/${id}/activate`)
export const disableRuntimeImage = (id) => mutation(`/api/v1/runtime-images/${id}/disable`)

export const createRegisteredTask = (data, idempotencyKey) => mutation('/api/v1/tasks', 'post', data, idempotencyKey)
export const preflightRegisteredTask = (data) => request({ url: '/api/v1/tasks/preflight', method: 'post', data })
export const fetchRegisteredTaskExecution = (taskId) => request({ url: `/api/v1/tasks/${taskId}`, method: 'get' })
export const fetchTaskRunComparison = (acceptanceRunId, runRound = 1) => request({
  url: `/api/v1/tasks/runs/${encodeURIComponent(acceptanceRunId)}/comparison`, method: 'get', params: { round: runRound }
})
