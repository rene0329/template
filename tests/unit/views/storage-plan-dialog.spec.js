import Dialog from '@/views/ManagementCenter/DataManagement/StoragePlanDialog.vue'
import { previewDatasetStorage, submitDatasetStorage } from '@/api/datasetStorageApi'
jest.mock('@/api/datasetStorageApi', () => ({ previewDatasetStorage: jest.fn(), submitDatasetStorage: jest.fn() }))
jest.mock('@/api/registrationApi', () => ({ requestId: () => 'test-request-id' }))
const assignments = [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 5, action: 'MOVE' }]
function context() {
  const vm = { ...Dialog.data(), $confirm: jest.fn().mockResolvedValue(true), $emit: jest.fn() }
  Object.entries(Dialog.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  return vm
}
beforeEach(() => jest.resetAllMocks())

it('previews without mutating data, then submits only the reviewed pure-data assignments', async() => {
  const vm = context()
  previewDatasetStorage.mockResolvedValue({ datasetCount: 1, assignments, placements: [], notices: [] })
  submitDatasetStorage.mockResolvedValue({ planId: 7 })
  await vm.open('aggregation')
  expect(submitDatasetStorage).not.toHaveBeenCalled()
  await vm.submit()
  expect(vm.$confirm).toHaveBeenCalled()
  expect(submitDatasetStorage).toHaveBeenCalledWith({ mode: 'aggregation', externalPlanId: 'storage-test-request-id', assignments })
  expect(vm.accepted.planId).toBe(7)
  await vm.submit()
  expect(submitDatasetStorage).toHaveBeenCalledTimes(1)
})

it('does not submit cancelled or empty plans and reuses the request identity on retries', async() => {
  const vm = context()
  previewDatasetStorage.mockResolvedValue({ assignments, placements: [], notices: [] })
  await vm.open('heat')
  vm.$confirm.mockRejectedValueOnce('cancel')
  await vm.submit()
  expect(submitDatasetStorage).not.toHaveBeenCalled()
  submitDatasetStorage.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ planId: 8 })
  await vm.submit()
  await vm.submit()
  expect(submitDatasetStorage.mock.calls[0][0]).toEqual(submitDatasetStorage.mock.calls[1][0])
  vm.accepted = null
  vm.pending.assignments = []
  await vm.submit()
  expect(submitDatasetStorage).toHaveBeenCalledTimes(2)
})
