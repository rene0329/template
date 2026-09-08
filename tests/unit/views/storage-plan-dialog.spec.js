import Dialog from '@/views/ManagementCenter/DataManagement/StoragePlanDialog.vue'
import { fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { previewDatasetStorage, submitDatasetStorage } from '@/api/datasetStorageApi'
jest.mock('@/api/datasetStorageApi', () => ({ previewDatasetStorage: jest.fn(), submitDatasetStorage: jest.fn() }))
jest.mock('@/api/registrationApi', () => ({ requestId: () => 'test-request-id', fetchRegisteredDatasets: jest.fn(), fetchRegisteredNodes: jest.fn() }))
const assignments = [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 5, action: 'MOVE' }]
function context() {
  const vm = { ...Dialog.data(), $confirm: jest.fn().mockResolvedValue(true), $emit: jest.fn() }
  Object.entries(Dialog.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  return vm
}
beforeEach(() => {
  jest.resetAllMocks()
  fetchRegisteredDatasets.mockResolvedValue({ list: [{ datasetId: 9, name: 'test', status: 'ACTIVE' }], total: 1 })
  fetchRegisteredNodes.mockResolvedValue({ list: [{ nodeId: 5, role: 'COMPUTE_STORAGE', schedulable: true }], total: 1 })
})

it('previews without mutating data, then submits only the reviewed pure-data assignments', async() => {
  const vm = context()
  previewDatasetStorage.mockResolvedValue({ datasetCount: 1, assignments, placements: [], notices: [] })
  submitDatasetStorage.mockResolvedValue({ planId: 7 })
  await vm.open('aggregation')
  expect(previewDatasetStorage).not.toHaveBeenCalled()
  vm.datasetIds = [9]
  vm.targetNodeId = 5
  await vm.load()
  expect(submitDatasetStorage).not.toHaveBeenCalled()
  await vm.submit()
  expect(vm.$confirm).toHaveBeenCalled()
  expect(submitDatasetStorage).toHaveBeenCalledWith({ mode: 'aggregation', datasetIds: [9], targetNodeId: 5, externalPlanId: 'storage-test-request-id', assignments })
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

it('requires aggregation inputs and invalidates the reviewed plan when they change', async() => {
  const vm = context()
  await vm.open('aggregation')
  await vm.load()
  expect(previewDatasetStorage).not.toHaveBeenCalled()
  expect(vm.error).toContain('请选择')
  vm.datasetIds = [9]
  vm.targetNodeId = 5
  previewDatasetStorage.mockResolvedValue({ assignments, placements: [], notices: [] })
  await vm.load()
  expect(previewDatasetStorage).toHaveBeenLastCalledWith('aggregation', { datasetIds: [9], targetNodeId: 5 })
  vm.targetNodeId = 6
  vm.invalidatePreview()
  await vm.submit()
  expect(submitDatasetStorage).not.toHaveBeenCalled()
  expect(vm.pending).toBeNull()
})
