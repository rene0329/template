import request from './axiosConfig'

const ROOT = '/api/v1/privacy-computing'

export const privacyRequestId = () => `privacy-${Date.now()}-${Math.random().toString(36).slice(2)}`

const utf8Base64 = (value) => {
  const bytes = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g,
    (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  return window.btoa(bytes)
}

const authorizationFor = (credentials = {}) =>
  `Basic ${utf8Base64(`${credentials.partyId || ''}:${credentials.secret || ''}`)}`

const redact = (value, sensitiveValues) => {
  if (typeof value !== 'string') return value
  return sensitiveValues.reduce((safe, item) => item ? safe.split(item).join('[REDACTED]') : safe, value)
}

const privacyRequest = (config, sensitiveValues = []) => request(config).catch(error => {
  const safe = new Error(redact(error.message || '隐私计算请求失败', sensitiveValues))
  const safeFields = ['status', 'code', 'errorCode', 'traceId']
  safeFields.forEach(field => { safe[field] = redact(error[field], sensitiveValues) })
  return Promise.reject(safe)
})

const authenticatedRequest = (config, credentials = {}) => {
  const authorization = authorizationFor(credentials)
  const secret = String(credentials.secret || '')
  return privacyRequest({
    ...config,
    headers: { ...(config.headers || {}), Authorization: authorization }
  }, [authorization, authorization.slice(6), `${credentials.partyId || ''}:${secret}`, secret])
}

export const fetchPrivacyCapabilities = (options = {}) => privacyRequest({
  url: `${ROOT}/capabilities`, method: 'get', ...options
})

export const fetchPrivacyTemplates = (options = {}) => privacyRequest({
  url: `${ROOT}/templates`, method: 'get', ...options
})

export const preflightPrivacyJob = (data, credentials) => authenticatedRequest({
  url: `${ROOT}/jobs/preflight`, method: 'post', data
}, credentials)

export const createPrivacyJob = (data, idempotencyKey = privacyRequestId(), credentials) => authenticatedRequest({
  url: `${ROOT}/jobs`,
  method: 'post',
  data,
  headers: { 'Idempotency-Key': idempotencyKey }
}, credentials)

export const fetchPrivacyJobs = (params = {}, credentials, options = {}) => authenticatedRequest({
  url: `${ROOT}/jobs`, method: 'get', params, ...options
}, credentials)

export const fetchPrivacyJob = (jobId, credentials, options = {}) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}`, method: 'get', ...options
}, credentials)

export const fetchPrivacyJobEvents = (jobId, credentials, options = {}) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/events`, method: 'get', ...options
}, credentials)

export const fetchPrivacyJobResult = (jobId, credentials) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/result`,
  method: 'get'
}, credentials)

export const fetchPrivacyJobEvidence = (jobId, credentials) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/evidence`,
  method: 'get'
}, credentials)

const participantDecision = (jobId, action, participantId, reason, credentials) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/${action}`,
  method: 'post',
  data: { participantId, ...(reason ? { reason } : {}) }
}, credentials)

export const approvePrivacyJob = (jobId, participantId, reason, credentials) =>
  participantDecision(jobId, 'approve', participantId, reason, credentials)

export const rejectPrivacyJob = (jobId, participantId, reason, credentials) =>
  participantDecision(jobId, 'reject', participantId, reason, credentials)

export const cancelPrivacyJob = (jobId, reason, credentials) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/cancel`,
  method: 'post',
  data: reason ? { reason } : {}
}, credentials)

export const retryPrivacyJob = (jobId, credentials, idempotencyKey = privacyRequestId()) => authenticatedRequest({
  url: `${ROOT}/jobs/${encodeURIComponent(jobId)}/retry`,
  method: 'post',
  headers: { 'Idempotency-Key': idempotencyKey }
}, credentials)
