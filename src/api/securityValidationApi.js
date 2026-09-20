import request from './axiosConfig'

const encodeBasic = (username, password) => {
  const value = `${username || ''}:${password || ''}`
  return `Basic ${window.btoa(value)}`
}

export const authorizeDatasetAccess = (scope, credentials, context = {}) => request({
  url: '/api/v1/security/access/authorizations',
  method: 'post',
  data: scope,
  headers: {
    'X-Reviewer-Authorization': encodeBasic(credentials.username, credentials.password),
    'X-Request-Id': context.requestId,
    'X-Run-Id': context.runId
  }
})

export const verifyDatasetAccessToken = (scope, token, context = {}) => request({
  url: '/api/v1/security/access/verifications',
  method: 'post',
  data: scope,
  headers: {
    'X-Dataset-Authorization': `Bearer ${token}`,
    'X-Request-Id': context.requestId,
    'X-Run-Id': context.runId
  }
})

export const fetchDatasetAccessAuditEvents = (params = {}) => request({
  url: '/api/v1/security/access/events',
  method: 'get',
  params
})

export const startSecureAggregation = requestId => request({
  url: '/api/v1/security/secure-aggregation/runs',
  method: 'post',
  headers: {
    'Idempotency-Key': requestId
  }
})

export const fetchSecureAggregationRun = runId => request({
  url: `/api/v1/security/secure-aggregation/runs/${encodeURIComponent(runId)}`,
  method: 'get'
})

export const fetchSecureAggregationEvents = runId => request({
  url: `/api/v1/security/secure-aggregation/runs/${encodeURIComponent(runId)}/events`,
  method: 'get'
})
