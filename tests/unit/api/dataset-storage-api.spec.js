import request from '@/api/axiosConfig'
import { fetchStoragePolicy, refreshDatasetHeat, previewDatasetStorage, submitDatasetStorage } from '@/api/datasetStorageApi'
jest.mock('@/api/axiosConfig', () => jest.fn())
it('uses registered dataset endpoints for heat and previewed storage operations', () => {
  fetchStoragePolicy({ silent: true })
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/datasets/storage-policy', method: 'get', silent: true })
  refreshDatasetHeat()
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/datasets/heat-refresh', method: 'post' })
  previewDatasetStorage('heat')
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/storage-plans/preview', method: 'post', params: { mode: 'heat' }})
  const plan = { externalPlanId: 'stable-request', mode: 'heat', assignments: [] }
  submitDatasetStorage(plan)
  expect(request).toHaveBeenLastCalledWith({ url: '/api/v1/scheduling/storage-plans', method: 'post', data: plan })
})
