import SelectData from '@/views/ManagementCenter/SelectData/index.vue'
import FrameNet from '@/views/ManagementCenter/FrameNet/index.vue'
import { fetchRegisteredDatasets, createRegisteredTask, preflightRegisteredTask } from '@/api/registrationApi'
import { fetchNetworkTopology } from '@/api/managementCenterApi'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(), createRegisteredTask: jest.fn(),
  preflightRegisteredTask: jest.fn(), requestId: () => 'stable-request-key'
}))
jest.mock('@/api/managementCenterApi', () => ({ fetchNetworkTopology: jest.fn() }))

function context(component) {
  const vm = { ...component.data(), $message: { error: jest.fn(), success: jest.fn() },
    $refs: { datasetTable: { clearSelection: jest.fn() }}, $alert: jest.fn().mockResolvedValue(),
    $nextTick: jest.fn(), computeClusters: jest.fn() }
  Object.entries(component.methods).forEach(([key, method]) => { vm[key] = method.bind(vm) })
  Object.entries(component.computed || {}).forEach(([key, get]) => Object.defineProperty(vm, key, { get: () => get.call(vm) }))
  return vm
}

beforeEach(() => jest.clearAllMocks())

it('a user search supersedes an in-flight poll', async() => {
  const vm = context(SelectData)
  let finishPoll
  fetchRegisteredDatasets.mockImplementationOnce(() => new Promise(resolve => { finishPoll = resolve }))
    .mockResolvedValueOnce({ list: [{ datasetId: 2, name: 'new' }], total: 1 })
  const poll = vm.fetchData(true)
  vm.formInline.name = 'new'
  await vm.fetchData(false)
  finishPoll({ list: [{ datasetId: 1, name: 'old' }], total: 1 })
  await poll
  expect(vm.TaskData[0].datasetId).toBe(2)
  expect(vm.selectedRows).toEqual([])
})

it('failed submission retry reuses the key and real dataset IDs', async() => {
  const vm = context(SelectData)
  vm.selectedRows = [{ datasetId: 5001, dataId: 1 }]
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  createRegisteredTask.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ taskId: 42 })
  await vm.handleSubmit()
  await vm.handleSubmit()
  expect(createRegisteredTask.mock.calls[0]).toEqual(createRegisteredTask.mock.calls[1])
  expect(createRegisteredTask.mock.calls[0][0].datasetIds).toEqual([5001])
  expect(vm.lastTaskId).toBe(42)
})

it('rejects unavailable selections and prevents duplicate clicks', async() => {
  const vm = context(SelectData)
  vm.selectedRows = [{ datasetId: 5001 }]
  preflightRegisteredTask.mockResolvedValue({ valid: false, checks: [{ available: false, name: 'd', message: 'disabled' }] })
  const pending = vm.handleSubmit()
  await vm.handleSubmit()
  await pending
  expect(preflightRegisteredTask).toHaveBeenCalledTimes(1)
  expect(createRegisteredTask).not.toHaveBeenCalled()
  expect(vm.$alert).toHaveBeenCalledWith('d: disabled', expect.any(String), expect.any(Object))
})

it('retains selection during polling', async() => {
  const vm = context(SelectData)
  vm.selectedRows = [{ datasetId: 5 }]
  fetchRegisteredDatasets.mockResolvedValue({ list: [{ datasetId: 5, name: 'd' }], total: 1 })
  await vm.fetchData(true)
  expect(vm.selectedRows).toEqual([{ datasetId: 5 }])
})

it('a failed catalog load does not suppress topology updates', async() => {
  const vm = context(FrameNet)
  vm.computeClusters = jest.fn()
  fetchRegisteredDatasets.mockRejectedValue(new Error('catalog offline'))
  fetchNetworkTopology.mockResolvedValue({ nodes: [{ id: 'n', nodeId: 8, x: 10, y: 20 }], edges: [] })
  await Promise.all([vm.refreshDatasets(), vm.fetchData(false, true)])
  expect(vm.nodes[0].nodeId).toBe(8)
  expect(vm.datasetError).toContain('catalog offline')
})
