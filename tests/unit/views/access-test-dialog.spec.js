import AccessTestDialog from '@/views/ManagementCenter/DataManagement/AccessTestDialog.vue'
import { fetchRegisteredNodes } from '@/api/registrationApi'
import { fetchDatasetAccessEvents, runDatasetAccessTest } from '@/api/datasetAccessApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredNodes: jest.fn() }))
jest.mock('@/api/datasetAccessApi', () => ({
  fetchDatasetAccessEvents: jest.fn(), runDatasetAccessTest: jest.fn()
}))

function context() {
  const vm = {
    ...AccessTestDialog.data(),
    $message: { success: jest.fn() },
    $emit: jest.fn()
  }
  Object.entries(AccessTestDialog.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(AccessTestDialog.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { get: () => get.call(vm) }))
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('runs a full authenticated read on the selected consumer and reloads raw evidence', async() => {
  const vm = context()
  const dataset = { datasetId: 9, name: 'covertype', replicas: [{ nodeId: 2 }] }
  fetchRegisteredNodes.mockResolvedValue({
    list: [{ nodeId: 2, k8sNodeName: 'master-89', role: 'COMPUTE_STORAGE', schedulable: true }], total: 1
  })
  fetchDatasetAccessEvents.mockResolvedValue([])
  runDatasetAccessTest.mockResolvedValue({ success: true, bytesRead: 123 })

  await vm.open(dataset)
  vm.form.runId = 'judge-read-1'
  vm.credentials = { username: 'reviewer-a', password: 'secret' }
  await vm.run()

  expect(runDatasetAccessTest).toHaveBeenCalledWith(9, expect.objectContaining({
    consumerNodeId: 2, runId: 'judge-read-1', clearCache: true,
    requestId: expect.stringMatching(/^read-/)
  }), { username: 'reviewer-a', password: 'secret' })
  expect(fetchDatasetAccessEvents).toHaveBeenLastCalledWith({ datasetId: 9, runId: 'judge-read-1', limit: 50 })
  expect(vm.credentials.password).toBe('')
  expect(vm.$emit).toHaveBeenCalledWith('completed')
})
