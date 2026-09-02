import request from '@/api/axiosConfig'
import { fetchSchedulingPlans, fetchSchedulingPlan, fetchSchedulableDatasets, submitDatasetSchedule, submitComputeSchedule } from '@/api/schedulingApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

it('uses the external scheduling read endpoints, not the task schedule endpoint', () => {
  const params = { page: 2, pageSize: 10, status: 'RUNNING', query: 'external-42' }
  fetchSchedulingPlans(params)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/plans', method: 'get', params })
  fetchSchedulingPlan(42)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/plans/42', method: 'get' })
})

it('submits explicit compute plans with the selected runtime image', () => {
  const plan = { externalPlanId: 'manual-compute', taskId: 'manual-compute', runtimeImageId: 7, assignments: [] }
  submitComputeSchedule(plan)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/compute-plans', method: 'post', data: plan })
})

it('queries available replicas and submits the manual plan without replacing its identity', () => {
  const params = { datasetIds: '9', page: 1, pageSize: 1 }
  fetchSchedulableDatasets(params)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/datasets', method: 'get', params })
  const plan = { externalPlanId: 'manual-1', assignments: [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 3, action: 'COPY' }] }
  submitDatasetSchedule(plan)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/data-plans', method: 'post', data: plan })
})
