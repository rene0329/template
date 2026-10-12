import request from '@/api/axiosConfig'
import { createDomain, createUser, fetchRateLimitConfiguration, fetchRateLimitHistory, resetUserPassword, rollbackRateLimitConfiguration, updateDomain, updateRateLimitConfiguration, updateUser } from '@/api/adminApi'

jest.mock('@/api/axiosConfig', () => jest.fn())
beforeEach(() => { jest.resetAllMocks(); request.mockResolvedValue({}) })

it('uses the administrator domain and user endpoints', () => {
  createDomain({ code: 'D', name: '域 D' })
  updateDomain(4, { enabled: false })
  createUser({ username: 'owner', roles: ['DATA_OWNER'], domainId: 4 })
  updateUser(8, { enabled: false })
  resetUserPassword(8, 'new-password')
  fetchRateLimitConfiguration()
  updateRateLimitConfiguration({ version: 4, pathRules: '*->master-40=960k' })
  fetchRateLimitHistory(12)
  rollbackRateLimitConfiguration({ version: 5, restoreVersion: 3 })
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/admin/domains', method: 'post', data: { code: 'D', name: '域 D' }},
    { url: '/api/v1/admin/domains/4', method: 'patch', data: { enabled: false }},
    { url: '/api/v1/admin/users', method: 'post', data: { username: 'owner', roles: ['DATA_OWNER'], domainId: 4 }},
    { url: '/api/v1/admin/users/8', method: 'patch', data: { enabled: false }},
    { url: '/api/v1/admin/users/8/reset-password', method: 'post', data: { password: 'new-password' }},
    { url: '/api/v1/admin/rate-limits', method: 'get' },
    { url: '/api/v1/admin/rate-limits', method: 'put', data: { version: 4, pathRules: '*->master-40=960k' }},
    { url: '/api/v1/admin/rate-limits/history', method: 'get', params: { limit: 12 }},
    { url: '/api/v1/admin/rate-limits/rollback', method: 'post', data: { version: 5, restoreVersion: 3 }}
  ])
})
