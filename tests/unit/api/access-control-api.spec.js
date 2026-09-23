import request from '@/api/axiosConfig'
import { fetchAccessGrantLog, fetchDatasetAccess, requestDatasetAccessGrant } from '@/api/accessControlApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

beforeEach(() => jest.resetAllMocks())

it('lists dataset access for the current account and applies for a temporary grant', () => {
  fetchDatasetAccess()
  fetchDatasetAccess({ silent: true })
  requestDatasetAccessGrant(42, '联合建模需要读取该数据集')
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/security/dataset-access', method: 'get' },
    { url: '/api/v1/security/dataset-access', method: 'get', silent: true },
    { url: '/api/v1/security/dataset-access/grants', method: 'post', data: { datasetId: 42, reason: '联合建模需要读取该数据集' }}
  ])
})

it('reads the administrator access grant log with a row limit', () => {
  fetchAccessGrantLog()
  fetchAccessGrantLog(50)
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/security/dataset-access/grants', method: 'get', params: { limit: 500 }},
    { url: '/api/v1/security/dataset-access/grants', method: 'get', params: { limit: 50 }}
  ])
})
