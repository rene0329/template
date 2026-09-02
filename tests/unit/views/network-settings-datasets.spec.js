import Settings from '@/views/ManagementCenter/Settings/index.vue'
import { fetchRegisteredNodes, fetchRegisteredDatasets } from '@/api/registrationApi'

jest.mock('echarts', () => ({}))
jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredNodes: jest.fn(), fetchRegisteredDatasets: jest.fn(), updateRegisteredNode: jest.fn()
}))
jest.mock('@/api/managementCenterApi', () => ({ fetchNodeMetrics: jest.fn() }))

function context() {
  const vm = { ...Settings.data(), $message: { error: jest.fn() }}
  Object.entries(Settings.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(Settings.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { get: () => get.call(vm) }))
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('uses non-missing replicas for both node counts and the dataset panel', () => {
  const vm = context()
  vm.TaskData = [{ nodeId: 1 }, { nodeId: 2 }]
  vm.datasets = [
    { datasetId: 10, name: 'present', replicas: [
      { nodeId: 1, availability: 'AVAILABLE', effectiveAvailability: 'USABLE', filePath: '/present', sizeBytes: 100 },
      { nodeId: 1, availability: 'MISSING', filePath: '/old-path', sizeBytes: 999 }
    ] },
    { datasetId: 11, name: 'moved', replicas: [
      { nodeId: 1, availability: 'MISSING' },
      { nodeId: 2, availability: 'AVAILABLE', effectiveAvailability: 'USABLE' }
    ] },
    { datasetId: 12, name: 'missing', replicas: [{ nodeId: 1, effectiveAvailability: 'MISSING' }] },
    { datasetId: 13, name: 'another', replicas: [{ nodeId: 1, availability: 'AVAILABLE' }] }
  ]
  vm.selectDatasetNode(vm.TaskData[0])
  expect(vm.datasetCountForNode(vm.TaskData[0])).toBe(2)
  expect(vm.selectedNodeDatasets.map(row => row.datasetId)).toEqual([10, 13])
  expect(vm.selectedNodeDatasets.reduce((total, row) => total + row.replicaCount, 0)).toBe(2)
  expect(vm.selectedNodeDatasets[0]).toMatchObject({ filePath: '/present', replicaStatus: 'USABLE', dataSize: 100 })
  expect(vm.datasets[0].replicas).toHaveLength(2)
  vm.selectDatasetNode(vm.TaskData[1])
  expect(vm.datasetCountForNode(vm.TaskData[1])).toBe(1)
  expect(vm.selectedNodeDatasets.map(row => row.datasetId)).toEqual([11])
})

it('shows an empty panel and zero datasets for missing-only nodes', () => {
  const vm = context()
  vm.TaskData = [{ nodeId: 1 }]
  vm.datasets = [{ datasetId: 10, replicas: [{ nodeId: 1, availability: 'MISSING' }] }]
  expect(vm.selectedNodeDatasets).toEqual([])
  vm.selectDatasetNode(vm.TaskData[0])
  expect(vm.datasetCountForNode(vm.TaskData[0])).toBe(0)
  expect(vm.selectedNodeDatasets).toEqual([])
})

it('prefers a node with non-missing datasets when selecting a node after loading', async() => {
  const vm = context()
  vm.datasets = [{ datasetId: 10, replicas: [
    { nodeId: 1, availability: 'MISSING' }, { nodeId: 2, availability: 'AVAILABLE' }
  ] }]
  fetchRegisteredNodes.mockResolvedValue({ list: [
    { nodeId: 1, k8sNodeName: 'old', role: 'STORAGE' },
    { nodeId: 2, k8sNodeName: 'current', role: 'STORAGE' }
  ], total: 2 })
  await vm.fetchData()
  expect(vm.selectedNodeId).toBe('2')
  expect(vm.selectedNodeDatasets).toHaveLength(1)
})

it('updates counts and panel together when polling marks a replica missing', async() => {
  const vm = context()
  vm.TaskData = [{ nodeId: 1 }]
  vm.selectDatasetNode(vm.TaskData[0])
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [{ datasetId: 10, replicas: [{ nodeId: 1, availability: 'AVAILABLE' }] }], total: 1 })
    .mockResolvedValueOnce({ list: [{ datasetId: 10, replicas: [{ nodeId: 1, availability: 'MISSING' }] }], total: 1 })
  await vm.refreshDatasets()
  expect(vm.datasetCountForNode(vm.TaskData[0])).toBe(1)
  expect(vm.selectedNodeDatasets).toHaveLength(1)
  await vm.refreshDatasets()
  expect(vm.datasetCountForNode(vm.TaskData[0])).toBe(0)
  expect(vm.selectedNodeDatasets).toEqual([])
})
