import request from '@/api/axiosConfig'
import { exitImpersonation, impersonateUser } from '@/api/user'

jest.mock('@/api/axiosConfig', () => jest.fn())

beforeEach(() => {
  jest.resetAllMocks()
  request.mockResolvedValue({})
})

it('uses the audited administrator user-switch endpoints', () => {
  impersonateUser(7)
  exitImpersonation()

  expect(request.mock.calls.map(call => call[0])).toEqual([
    { url: '/api/v1/auth/impersonation', method: 'post', data: { userId: 7 }},
    { url: '/api/v1/auth/impersonation/exit', method: 'post' }
  ])
})
