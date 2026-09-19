import request from '@/api/axiosConfig'
import {
  approvePrivacyJob,
  cancelPrivacyJob,
  createPrivacyJob,
  fetchPrivacyCapabilities,
  fetchPrivacyJob,
  fetchPrivacyJobEvidence,
  fetchPrivacyJobEvents,
  fetchPrivacyJobResult,
  fetchPrivacyJobs,
  fetchPrivacyTemplates,
  preflightPrivacyJob,
  rejectPrivacyJob,
  retryPrivacyJob
} from '@/api/privacyComputingApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

const a = { partyId: 'A', secret: 'alpha-secret' }
const b = { partyId: 'B', secret: 'bravo-secret' }
const c = { partyId: 'C', secret: 'charlie-secret' }
const basic = credentials => `Basic ${window.btoa(`${credentials.partyId}:${credentials.secret}`)}`

beforeEach(() => {
  jest.resetAllMocks()
  request.mockResolvedValue({})
})

it('keeps the capability catalog public and authenticates preflight and listing independently', () => {
  const spec = { templateId: 'psi-2p-v1', participants: [{ partyId: 'A' }, { partyId: 'B' }] }
  fetchPrivacyCapabilities()
  fetchPrivacyTemplates()
  preflightPrivacyJob(spec, a)
  fetchPrivacyJobs({ status: 'RUNNING', limit: 100 }, b)
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/privacy-computing/capabilities', method: 'get' },
    { url: '/api/v1/privacy-computing/templates', method: 'get' },
    { url: '/api/v1/privacy-computing/jobs/preflight', method: 'post', data: spec, headers: { Authorization: basic(a) }},
    { url: '/api/v1/privacy-computing/jobs', method: 'get', params: { status: 'RUNNING', limit: 100 }, headers: { Authorization: basic(b) }}
  ])
})

it('creates a frozen job spec with an idempotency key and one-request Basic credentials', () => {
  const spec = { templateId: 'secure-sum-3p-v1', participants: [{ partyId: 'A' }] }
  createPrivacyJob(spec, 'privacy-request-1', a)
  expect(request).toHaveBeenCalledWith({
    url: '/api/v1/privacy-computing/jobs',
    method: 'post',
    data: spec,
    headers: { Authorization: basic(a), 'Idempotency-Key': 'privacy-request-1' }
  })
  expect(JSON.stringify(request.mock.calls)).not.toContain(a.secret)
})

it('binds each approval decision to matching Basic credentials', () => {
  approvePrivacyJob('job / 1', 'B', 'reviewed', b)
  rejectPrivacyJob('job / 1', 'C', 'digest mismatch', c)
  expect(request.mock.calls.map(call => call[0])).toEqual([
    {
      url: '/api/v1/privacy-computing/jobs/job%20%2F%201/approve', method: 'post',
      data: { participantId: 'B', reason: 'reviewed' }, headers: { Authorization: basic(b) }
    },
    {
      url: '/api/v1/privacy-computing/jobs/job%20%2F%201/reject', method: 'post',
      data: { participantId: 'C', reason: 'digest mismatch' }, headers: { Authorization: basic(c) }
    }
  ])
})

it('authenticates details, events, artifacts, cancellation and retry without identity headers', () => {
  fetchPrivacyJob('job / 1', b)
  fetchPrivacyJobEvents('job / 1', b)
  fetchPrivacyJobResult('job / 1', b)
  fetchPrivacyJobEvidence('job / 1', a)
  cancelPrivacyJob('job / 1', 'manual stop', b)
  retryPrivacyJob('job / 1', a, 'retry-2')
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201', method: 'get', headers: { Authorization: basic(b) }},
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/events', method: 'get', headers: { Authorization: basic(b) }},
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/result', method: 'get', headers: { Authorization: basic(b) }},
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/evidence', method: 'get', headers: { Authorization: basic(a) }},
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/cancel', method: 'post', data: { reason: 'manual stop' }, headers: { Authorization: basic(b) }},
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/retry', method: 'post', headers: { Authorization: basic(a), 'Idempotency-Key': 'retry-2' }}
  ])
  expect(JSON.stringify(request.mock.calls)).not.toContain('X-Privacy-Principal')
})

it('strips request config and credentials from rejected API errors', async() => {
  const unsafe = new Error(`authentication failed for ${a.secret}`)
  unsafe.status = 401
  unsafe.errorCode = 'PRIVACY_AUTH_INVALID'
  unsafe.response = { config: { headers: { Authorization: basic(a) }}}
  request.mockRejectedValue(unsafe)
  let caught
  try {
    await fetchPrivacyJob('job-1', a)
  } catch (error) {
    caught = error
  }
  expect(caught).toMatchObject({ message: 'authentication failed for [REDACTED]', status: 401, errorCode: 'PRIVACY_AUTH_INVALID' })
  expect(caught.response).toBeUndefined()
  expect(caught.config).toBeUndefined()
  expect(JSON.stringify(caught)).not.toContain(a.secret)
})

it('does not let request options replace the selected party credentials', () => {
  fetchPrivacyJob('job-1', b, { silent: true, headers: { Authorization: 'Basic attacker' }})
  expect(request).toHaveBeenCalledWith({
    url: '/api/v1/privacy-computing/jobs/job-1',
    method: 'get',
    silent: true,
    headers: { Authorization: basic(b) }
  })
})
