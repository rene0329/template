import DataManagement from '@/views/ManagementCenter/DataManagement/index.vue'
import { fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { fetchStoragePolicy, refreshDatasetHeat } from '@/api/datasetStorageApi'
import { formatHeat } from '@/utils/dataset-catalog'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(), fetchRegisteredNodes: jest.fn()
}))
jest.mock('@/api/schedulingApi', () => ({ fetchSchedulableDatasets: jest.fn(), submitDatasetSchedule: jest.fn() }))
jest.mock('@/api/datasetStorageApi', () => ({ fetchStoragePolicy: jest.fn(), refreshDatasetHeat: jest.fn() }))

function context() {
  const vm = { ...DataManagement.data(), $message: { success: jest.fn(), error: jest.fn() }}
  Object.entries(DataManagement.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(DataManagement.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { get: () => get.call(vm) }))
  return vm
}

const dataset = {
  datasetId: 9, dataId: 1, name: 'upload-medium-16mb', datasetCode: 'upload-medium-16mb',
  version: '1.0', status: 'ACTIVE', healthStatus: 'HEALTHY', availableReplicaCount: 2, totalReplicaCount: 2,
  replicas: [{ replicaId: 9, nodeId: 6, sizeBytes: 16909290 }, { replicaId: 10, nodeId: 5, sizeBytes: 16909290 }]
}

beforeEach(() => {
  jest.resetAllMocks()
  fetchStoragePolicy.mockResolvedValue({ heatEnabled: true, aggregationEnabled: false })
  fetchRegisteredNodes.mockResolvedValue({ list: [
    { nodeId: 6, displayName: 'ali-bj' }, { nodeId: 5, displayName: 'ali-sh' }, { nodeId: 3, displayName: 'master-88' }
  ], total: 3 })
})

it('renders real logical heat including zero and retains heat in the detail', async() => {
  const vm = context()
  fetchRegisteredDatasets.mockResolvedValue({ list: [{ ...dataset, dataHeat: 47.25 }], total: 1 })
  await vm.fetchData()
  vm.openTaskDialog(vm.TaskData[0])
  expect(vm.selectedTask.dataHeat).toBe(47.25)
  expect(formatHeat(0)).toBe('0.00')
  expect(formatHeat(47.25)).toBe('47.25')
  expect(formatHeat(null)).toBe('暂无数据')
})

it('updates logical heat rather than only refreshing the legacy list', async() => {
  const vm = context()
  vm.fetchData = jest.fn()
  refreshDatasetHeat.mockResolvedValue({ updatedCount: 8 })
  await vm.onUpdateHeatAll()
  expect(refreshDatasetHeat).toHaveBeenCalledTimes(1)
  expect(vm.$message.success).toHaveBeenCalledWith('已更新 8 个数据集的热度')
  expect(vm.fetchData).toHaveBeenCalled()
  expect(vm.heatLoading).toBe(false)
})

it('keeps the dataset list usable when the storage policy cannot be loaded', async() => {
  const vm = context()
  fetchRegisteredDatasets.mockResolvedValue({ list: [dataset], total: 1 })
  fetchStoragePolicy.mockRejectedValue(new Error('旧后端'))
  await vm.fetchData()
  expect(vm.TaskData[0].datasetId).toBe(9)
  expect(vm.storagePolicy).toEqual({})
  expect(vm.policyError).toContain('旧后端')
})

it('restores storage entry points while respecting server-side task conditions', () => {
  const vm = context()
  vm.$refs = { storagePlan: { open: jest.fn() }}
  vm.storagePolicy = { heatEnabled: false, aggregationEnabled: true }
  vm.openStoragePlan('heat')
  vm.openStoragePlan('aggregation')
  expect(vm.$refs.storagePlan.open).toHaveBeenCalledTimes(1)
  expect(vm.$refs.storagePlan.open).toHaveBeenCalledWith('aggregation')
})

it('uses the registration catalog including inactive datasets and counts logical datasets once', async() => {
  const vm = context()
  vm.formInline.name = 'upload'
  const disabled = { datasetId: 8, name: 'upload-empty', status: 'DISABLED', replicas: [] }
  fetchRegisteredDatasets.mockResolvedValue({ list: [dataset, disabled], total: 2 })
  await vm.fetchData()
  expect(fetchRegisteredDatasets).toHaveBeenCalledWith({ page: 1, pageSize: 10, query: 'upload' }, {})
  expect(vm.TaskData.map(row => row.datasetId)).toEqual([9, 8])
  expect(vm.TaskData[0].dataSize).toBe(16909290)
  expect(vm.TaskData[1].status).toBe('DISABLED')
  expect(vm.TaskData[1].dataSize).toBeNull()
  expect(vm.storageNodes(vm.TaskData[0])).toBe('ali-bj、ali-sh')
  expect(vm.total).toBe(2)
})

it('reflects registry status changes in the list and open detail and removes deleted datasets', async() => {
  const vm = context()
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [dataset], total: 1 })
  await vm.fetchData()
  vm.openTaskDialog(vm.TaskData[0])
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [{ ...dataset, status: 'DISABLED' }], total: 1 })
  await vm.fetchData(true)
  expect(vm.selectedTask.status).toBe('DISABLED')
  expect(fetchRegisteredDatasets).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, query: '' }, { silent: true })
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [], total: 0 })
  await vm.fetchData(true)
  expect(vm.TaskData).toEqual([])
  expect(vm.total).toBe(0)
  expect(vm.dialogVisibleDetail).toBe(false)
})

it('hides missing storage locations and detail rows without changing the source records', async() => {
  const vm = context()
  const replicas = [
    { replicaId: 1, nodeId: 6, availability: 'MISSING' },
    { replicaId: 2, nodeId: 5, availability: 'AVAILABLE', effectiveAvailability: 'USABLE' },
    { replicaId: 3, nodeId: 4, effectiveAvailability: 'MISSING' },
    { replicaId: 4, nodeId: 5, availability: 'MISSING' },
    { replicaId: 5, nodeId: 3, availability: 'AVAILABLE', effectiveAvailability: 'USABLE' },
    { replicaId: 6, nodeId: 5, availability: 'AVAILABLE', effectiveAvailability: 'USABLE' }
  ]
  fetchRegisteredDatasets.mockResolvedValue({ list: [{ ...dataset, replicas }], total: 1 })
  await vm.fetchData()
  expect(vm.storageNodes(vm.TaskData[0])).toBe('ali-sh、master-88')
  vm.openTaskDialog(vm.TaskData[0])
  expect(vm.selectedTask.replicas).toEqual(replicas)
  expect(vm.selectedTask.replicas).toHaveLength(6)
  expect(vm.detailReplicas.map(replica => replica.replicaId)).toEqual([2, 5, 6])
})

it('shows no storage location when all replicas are missing or absent', () => {
  const vm = context()
  expect(vm.storageNodes({ replicas: [
    { nodeId: 6, availability: 'MISSING' },
    { nodeId: 5, effectiveAvailability: 'MISSING' }
  ] })).toBe('暂无副本')
  expect(vm.storageNodes({})).toBe('暂无副本')
  expect(vm.storageNodes({ replicas: [] })).toBe('暂无副本')
})

it('updates displayed storage locations when a poll marks a replica missing', async() => {
  const vm = context()
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [dataset], total: 1 })
    .mockResolvedValueOnce({ list: [{ ...dataset, replicas: [
      { ...dataset.replicas[0], availability: 'MISSING' }, dataset.replicas[1]
    ] }], total: 1 })
  await vm.fetchData()
  expect(vm.storageNodes(vm.TaskData[0])).toBe('ali-bj、ali-sh')
  await vm.openTaskDialog(vm.TaskData[0])
  expect(vm.detailReplicas).toHaveLength(2)
  await vm.fetchData(true)
  expect(vm.storageNodes(vm.TaskData[0])).toBe('ali-sh')
  expect(vm.detailReplicas.map(replica => replica.nodeId)).toEqual([5])
})

it('shows registered node names in dataset details with Kubernetes names as a fallback', async() => {
  const vm = context()
  fetchRegisteredNodes.mockResolvedValue({ list: [
    { nodeId: 6, displayName: '北京存储节点', k8sNodeName: 'alibj', enabled: false },
    { nodeId: 5, k8sNodeName: 'alish' }
  ], total: 2 })
  await vm.openTaskDialog(dataset)
  expect(vm.nodeName('6')).toBe('北京存储节点')
  expect(vm.nodeName(5)).toBe('alish')
  expect(fetchRegisteredNodes).toHaveBeenCalledWith({ page: 1, pageSize: 100 }, { silent: true })
  expect(vm.nodeNameError).toBe('')
})

it('shows no detail rows when all replicas are missing', async() => {
  const vm = context()
  await vm.openTaskDialog({ ...dataset, replicas: [
    { nodeId: 6, availability: 'MISSING' }, { nodeId: 5, effectiveAvailability: 'MISSING' }
  ] })
  expect(vm.detailReplicas).toEqual([])
  await vm.openTaskDialog({ datasetId: 99 })
  expect(vm.detailReplicas).toEqual([])
})

it('retains non-missing details and falls back to IDs if the node lookup fails', async() => {
  const vm = context()
  fetchRegisteredNodes.mockRejectedValueOnce(new Error('offline'))
  await vm.openTaskDialog(dataset)
  expect(vm.detailReplicas).toHaveLength(2)
  expect(vm.nodeName(6)).toBe('节点 #6（名称未找到）')
  expect(vm.nodeNameError).toContain('节点名称加载失败')
  expect(vm.nodeNamesLoading).toBe(false)
  fetchRegisteredNodes.mockResolvedValueOnce({ list: [{ nodeId: 6, displayName: '北京节点' }], total: 1 })
  await vm.openTaskDialog(dataset)
  expect(vm.nodeName(6)).toBe('北京节点')
  expect(vm.nodeNameError).toBe('')
})

it('ignores stale node lookup responses after reopening details', async() => {
  const vm = context()
  let finish
  fetchRegisteredNodes.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    .mockResolvedValueOnce({ list: [{ nodeId: 6, displayName: '新名称' }], total: 1 })
  const first = vm.openTaskDialog(dataset)
  await vm.openTaskDialog(dataset)
  finish({ list: [{ nodeId: 6, displayName: '旧名称' }], total: 1 })
  await first
  expect(vm.nodeName(6)).toBe('新名称')
})

it('loads names for the main list and avoids reloading them on every background poll', async() => {
  const vm = context()
  fetchRegisteredDatasets.mockResolvedValue({ list: [dataset], total: 1 })
  await vm.fetchData()
  expect(vm.storageNodes(vm.TaskData[0])).toBe('ali-bj、ali-sh')
  expect(vm.dialogVisibleDetail).toBe(false)
  expect(fetchRegisteredNodes).toHaveBeenCalledTimes(1)
  await vm.fetchData(true)
  expect(fetchRegisteredNodes).toHaveBeenCalledTimes(1)
  fetchRegisteredNodes.mockResolvedValueOnce({ list: [
    { nodeId: 6, displayName: '北京节点' }, { nodeId: 5, k8sNodeName: 'alish' }
  ], total: 2 })
  await vm.fetchData()
  expect(vm.storageNodes(vm.TaskData[0])).toBe('北京节点、alish')
})

it('does not block the dataset list on name lookups and retains known names if refresh fails', async() => {
  const vm = context()
  let finishNames
  fetchRegisteredDatasets.mockResolvedValue({ list: [dataset], total: 1 })
  fetchRegisteredNodes.mockImplementationOnce(() => new Promise(resolve => { finishNames = resolve }))
  await vm.fetchData()
  expect(vm.TaskData).toHaveLength(1)
  expect(vm.loading).toBe(false)
  finishNames({ list: [{ nodeId: 6, displayName: '北京节点' }], total: 1 })
  await Promise.resolve()
  await Promise.resolve()
  fetchRegisteredNodes.mockRejectedValueOnce(new Error('offline'))
  await vm.loadNodeNames()
  expect(vm.nodeName(6)).toBe('北京节点')
  expect(vm.nodeName(5)).toBe('节点 #5（名称未找到）')
  expect(vm.nodeNameError).toContain('节点名称加载失败')
})

it('moves back to the last valid page when registry deletion empties the current page', async() => {
  const vm = context()
  vm.currentPage = 2
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [], total: 1 })
    .mockResolvedValueOnce({ list: [dataset], total: 1 })
  await vm.fetchData(true)
  expect(vm.currentPage).toBe(1)
  expect(vm.TaskData[0].datasetId).toBe(9)
  expect(vm.refreshing).toBe(false)
})

it('does not let an older refresh overwrite a newer search', async() => {
  const vm = context()
  let resolveOld
  fetchRegisteredDatasets.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  const oldRequest = vm.fetchData(true)
  vm.formInline.name = 'upload'
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [dataset], total: 1 })
  await vm.fetchData()
  resolveOld({ list: [], total: 0 })
  await oldRequest
  expect(vm.TaskData[0].datasetId).toBe(9)
  expect(vm.total).toBe(1)
})

it('keeps the last successful list and timestamp when a refresh fails', async() => {
  const vm = context()
  vm.TaskData = [dataset]
  vm.lastUpdatedAt = '12:00:00'
  fetchRegisteredDatasets.mockRejectedValue(new Error('offline'))
  await vm.fetchData(true)
  expect(vm.TaskData).toEqual([dataset])
  expect(vm.lastUpdatedAt).toBe('12:00:00')
  expect(vm.loadError).toContain('offline')
  expect(vm.$message.error).not.toHaveBeenCalled()
})

it('opens manual scheduling only for an active logical dataset with available replicas', () => {
  const vm = context()
  vm.$refs = { manualSchedule: { open: jest.fn() }}
  vm.openScheduleDialog(dataset)
  expect(vm.$refs.manualSchedule.open).toHaveBeenCalledWith(dataset)
  vm.openScheduleDialog({ ...dataset, status: 'DISABLED' })
  vm.openScheduleDialog({ ...dataset, availableReplicaCount: 0 })
  expect(vm.$refs.manualSchedule.open).toHaveBeenCalledTimes(1)
  expect(DataManagement.methods.toggleStatus).toBeUndefined()
})
