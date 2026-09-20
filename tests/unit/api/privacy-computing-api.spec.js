import request from '@/api/axiosConfig'
import { approvePrivacyJob, createPrivacyJob, fetchPendingPrivacyApprovals, fetchPrivacyCapabilities, fetchPrivacyJob, fetchPrivacyJobs, fetchPrivacyTemplates, preflightPrivacyJob, rejectPrivacyJob, retryPrivacyJob } from '@/api/privacyComputingApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

beforeEach(() => { jest.resetAllMocks(); request.mockResolvedValue({}) })

it('keeps capability endpoints public and protects job endpoints through the shared Bearer interceptor', () => {
  const spec = { templateId: 'psi-2p-v1', inputs: [{ slotId: 'P0', datasetId: 1 }] }
  fetchPrivacyCapabilities()
  fetchPrivacyTemplates()
  preflightPrivacyJob(spec)
  fetchPrivacyJobs({ status: 'RUNNING' })
  fetchPendingPrivacyApprovals()
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/privacy-computing/capabilities', method: 'get', skipAuth: true },
    { url: '/api/v1/privacy-computing/templates', method: 'get', skipAuth: true },
    { url: '/api/v1/privacy-computing/jobs/preflight', method: 'post', data: spec },
    { url: '/api/v1/privacy-computing/jobs', method: 'get', params: { status: 'RUNNING' }},
    { url: '/api/v1/privacy-computing/approvals/pending', method: 'get', params: {}}
  ])
  expect(JSON.stringify(request.mock.calls)).not.toContain('Basic')
})

it('creates a job using slot inputs and an idempotency key', () => {
  const spec = { templateId: 'psi-2p-v1', inputs: [{ slotId: 'P0', datasetId: 1, datasetVersion: 'v1', fields: ['id'] }] }
  createPrivacyJob(spec, 'request-1')
  expect(request).toHaveBeenCalledWith({ url: '/api/v1/privacy-computing/jobs', method: 'post', data: spec, headers: { 'Idempotency-Key': 'request-1' }})
})

it('derives the approver from JWT and sends only the decision reason', () => {
  approvePrivacyJob('job / 1', 'reviewed')
  rejectPrivacyJob('job / 1', 'not allowed')
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/approve', method: 'post', data: { reason: 'reviewed' }},
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/reject', method: 'post', data: { reason: 'not allowed' }}
  ])
  expect(JSON.stringify(request.mock.calls)).not.toContain('participantId')
})

it('encodes job ids and creates explicit retries', () => {
  fetchPrivacyJob('job / 1', { silent: true })
  retryPrivacyJob('job / 1', 'retry-1')
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201', method: 'get', silent: true },
    { url: '/api/v1/privacy-computing/jobs/job%20%2F%201/retry', method: 'post', headers: { 'Idempotency-Key': 'retry-1' }}
  ])
})
