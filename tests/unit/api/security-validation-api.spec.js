import request from '@/api/axiosConfig'
import {
  authorizeDatasetAccess,
  fetchDatasetAccessAuditEvents,
  startSecureAggregation,
  fetchSecureAggregationEvents
} from '@/api/securityValidationApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

beforeEach(() => jest.resetAllMocks())

it('uses verified credentials and preserves the exact requested access scope', () => {
  const scope = { datasetId: '9', datasetVersion: 'v1', path: '/dataset/a.bin', action: 'READ', targetNode: 'master-89' }
  authorizeDatasetAccess(scope, { username: 'reviewer-a', password: 'secret' }, { requestId: 'request-1', runId: 'run-1' })
  expect(request).toHaveBeenCalledWith({
    url: '/api/v1/security/access/authorizations', method: 'post', data: scope,
    headers: {
      Authorization: `Basic ${window.btoa('reviewer-a:secret')}`,
      'X-Request-Id': 'request-1',
      'X-Run-Id': 'run-1'
    }
  })
})

it('queries raw access decisions and aggregation exchange events', () => {
  const credentials = { username: 'A', password: 'party-a-secret' }
  fetchDatasetAccessAuditEvents({ runId: 'run-1', limit: 50 })
  startSecureAggregation('aggregate-request-1', credentials)
  fetchSecureAggregationEvents('run / 1', credentials)
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/security/access/events', method: 'get', params: { runId: 'run-1', limit: 50 }},
    { url: '/api/v1/security/secure-aggregation/runs', method: 'post', headers: {
      'Idempotency-Key': 'aggregate-request-1', Authorization: `Basic ${window.btoa('A:party-a-secret')}`
    }},
    { url: '/api/v1/security/secure-aggregation/runs/run%20%2F%201/events', method: 'get', headers: {
      Authorization: `Basic ${window.btoa('A:party-a-secret')}`
    }}
  ])
})
