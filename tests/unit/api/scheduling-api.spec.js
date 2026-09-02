import request from '@/api/axiosConfig'
import { fetchSchedulingPlans, fetchSchedulingPlan } from '@/api/schedulingApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

it('uses the external scheduling read endpoints, not the task schedule endpoint', () => {
  const params = { page: 2, pageSize: 10, status: 'RUNNING', query: 'external-42' }
  fetchSchedulingPlans(params)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/plans', method: 'get', params })
  fetchSchedulingPlan(42)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/plans/42', method: 'get' })
})
