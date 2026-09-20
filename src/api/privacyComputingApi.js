import request from './axiosConfig'

const ROOT = '/api/v1/privacy-computing'

export const privacyRequestId = () => `privacy-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const fetchPrivacyCapabilities = (options = {}) => request({
  url: `${ROOT}/capabilities`, method: 'get', skipAuth: true, ...options
})

export const fetchPrivacyTemplates = (options = {}) => request({
  url: `${ROOT}/templates`, method: 'get', skipAuth: true, ...options
})

export const preflightPrivacyJob = data => request({
  url: `${ROOT}/jobs/preflight`, method: 'post', data
})

export const createPrivacyJob = (data, idempotencyKey = privacyRequestId()) => request({
  url: `${ROOT}/jobs`, method: 'post', data, headers: { 'Idempotency-Key': idempotencyKey }
})

export const fetchPrivacyJobs = (params = {}, options = {}) => request({
  url: `${ROOT}/jobs`, method: 'get', params, ...options
})

export const fetchPendingPrivacyApprovals = (params = {}, options = {}) => request({
  url: `${ROOT}/approvals/pending`, method: 'get', params, ...options
})

export const fetchPrivacyJob = (jobId, options = {}) => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}`, method: 'get', ...options
})

export const fetchPrivacyJobEvents = (jobId, options = {}) => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/events`, method: 'get', ...options
})

export const fetchPrivacyJobResult = jobId => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/result`, method: 'get'
})

export const fetchPrivacyJobEvidence = jobId => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/evidence`, method: 'get'
})

const participantDecision = (jobId, action, reason) => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/${action}`,
  method: 'post',
  data: reason ? { reason } : {}
})

export const approvePrivacyJob = (jobId, reason) => participantDecision(jobId, 'approve', reason)
export const rejectPrivacyJob = (jobId, reason) => participantDecision(jobId, 'reject', reason)

export const cancelPrivacyJob = (jobId, reason) => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/cancel`, method: 'post', data: reason ? { reason } : {}
})

export const retryPrivacyJob = (jobId, idempotencyKey = privacyRequestId()) => request({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/retry`,
  method: 'post',
  headers: { 'Idempotency-Key': idempotencyKey }
})
