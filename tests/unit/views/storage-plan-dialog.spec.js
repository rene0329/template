import Dialog from '@/views/ManagementCenter/DataManagement/StoragePlanDialog.vue'
import { fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { previewDatasetStorage, submitDatasetStorage } from '@/api/datasetStorageApi'
jest.mock('@/api/datasetStorageApi', () => ({ previewDatasetStorage: jest.fn(), submitDatasetStorage: jest.fn() }))
jest.mock('@/api/registrationApi', () => ({ requestId: () => 'test-request-id', fetchRegisteredDatasets: jest.fn(), fetchRegisteredNodes: jest.fn() }))
const assignments = [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 5, action: 'MOVE' }]
function context() {
  const vm = { ...Dialog.data(), $confirm: jest.fn().mockResolvedValue(true), $emit: jest.fn(), $router: { push: jest.fn() }}
  Object.entries(Dialog.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  return vm
}

beforeEach(() => {
  jest.resetAllMocks()
})

it('opens the registered scheduling logs route after a plan is submitted', () => {
  const vm = context()
  vm.visible = true
  vm.viewLogs()
  expect(vm.visible).toBe(false)
  expect(vm.$router.push).toHaveBeenCalledWith({ name: 'SchedulingLogs' })
})

it('previews heat placement without mutating data, then submits only the reviewed pure-data assignments', async() => {
  const vm = context()
  previewDatasetStorage.mockResolvedValue({ datasetCount: 1, assignments, placements: [], notices: [] })
  submitDatasetStorage.mockResolvedValue({ planId: 7 })
  await vm.open()
  expect(vm.visible).toBe(true)
  expect(previewDatasetStorage).toHaveBeenCalledWith('heat')
  expect(submitDatasetStorage).not.toHaveBeenCalled()
  await vm.submit()
  expect(vm.$confirm).toHaveBeenCalled()
  expect(submitDatasetStorage).toHaveBeenCalledWith({ mode: 'heat', externalPlanId: 'storage-test-request-id', assignments })
  expect(vm.accepted.planId).toBe(7)
  expect(vm.$emit).toHaveBeenCalledWith('submitted', vm.accepted)
  await vm.submit()
  expect(submitDatasetStorage).toHaveBeenCalledTimes(1)
})

it('does not submit cancelled or empty plans and reuses the request identity on retries', async() => {
  const vm = context()
  previewDatasetStorage.mockResolvedValue({ assignments, placements: [], notices: [] })
  await vm.open()
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

it('has no in-place aggregation mode and never loads dataset or node pickers', async() => {
  const vm = context()
  previewDatasetStorage.mockResolvedValue({ assignments: [], placements: [], notices: [] })
  await vm.open('aggregation')
  expect(previewDatasetStorage).toHaveBeenCalledTimes(1)
  expect(previewDatasetStorage).toHaveBeenCalledWith('heat')
  expect(fetchRegisteredDatasets).not.toHaveBeenCalled()
  expect(fetchRegisteredNodes).not.toHaveBeenCalled()
  expect(vm).not.toHaveProperty('mode')
  expect(vm).not.toHaveProperty('datasetIds')
  expect(vm.pending.mode).toBe('heat')
})

it('ignores a superseded preview and reports preview failures', async() => {
  const vm = context()
  let finish
  previewDatasetStorage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    .mockRejectedValueOnce(new Error('offline'))
  const first = vm.open()
  await vm.load()
  finish({ assignments, placements: [], notices: [] })
  await first
  expect(vm.preview).toBeNull()
  expect(vm.pending).toBeNull()
  expect(vm.error).toBe('分配预览失败：offline')
  expect(vm.loading).toBe(false)
})
