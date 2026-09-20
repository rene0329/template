import request from '@/api/axiosConfig'
import { assignDatasetOwner, createDomain, createUser, resetUserPassword, updateDomain, updateUser } from '@/api/adminApi'

jest.mock('@/api/axiosConfig', () => jest.fn())
beforeEach(() => { jest.resetAllMocks(); request.mockResolvedValue({}) })

it('uses the administrator domain and user endpoints', () => {
  createDomain({ code: 'D', name: '域 D' })
  updateDomain(4, { enabled: false })
  createUser({ username: 'owner', roles: ['DATA_OWNER'], domainId: 4 })
  updateUser(8, { enabled: false })
  resetUserPassword(8, 'new-password')
  assignDatasetOwner(12, 8)
  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/admin/domains', method: 'post', data: { code: 'D', name: '域 D' }},
    { url: '/api/v1/admin/domains/4', method: 'patch', data: { enabled: false }},
    { url: '/api/v1/admin/users', method: 'post', data: { username: 'owner', roles: ['DATA_OWNER'], domainId: 4 }},
    { url: '/api/v1/admin/users/8', method: 'patch', data: { enabled: false }},
    { url: '/api/v1/admin/users/8/reset-password', method: 'post', data: { password: 'new-password' }},
    { url: '/api/v1/admin/datasets/12/owner', method: 'put', data: { userId: 8 }}
  ])
})
