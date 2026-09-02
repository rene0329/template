import DataManagement from '@/views/ManagementCenter/DataManagement/index.vue'
import { fetchRegisteredDatasets, activateDataset, disableDataset } from '@/api/registrationApi'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(), activateDataset: jest.fn(), disableDataset: jest.fn()
}))

function context() {
  const vm = { ...DataManagement.data(), $message: { success: jest.fn(), error: jest.fn() }}
  Object.entries(DataManagement.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  return vm
}

const dataset = {
  datasetId: 9, dataId: 1, name: 'upload-medium-16mb', datasetCode: 'upload-medium-16mb',
  version: '1.0', status: 'ACTIVE', healthStatus: 'HEALTHY', availableReplicaCount: 2, totalReplicaCount: 2,
  replicas: [{ replicaId: 9, nodeId: 6, sizeBytes: 16909290 }, { replicaId: 10, nodeId: 5, sizeBytes: 16909290 }]
}

beforeEach(() => jest.resetAllMocks())

it('uses the registration catalog including inactive datasets and counts logical datasets once', async() => {
  const vm = context()
  vm.formInline.name = 'upload'
  const disabled = { datasetId: 8, name: 'upload-empty', status: 'DISABLED', replicas: [] }
  fetchRegisteredDatasets.mockResolvedValue({ list: [dataset, disabled], total: 2 })
  await vm.fetchData()
  expect(fetchRegisteredDatasets).toHaveBeenCalledWith({ page: 1, pageSize: 5, query: 'upload' }, {})
  expect(vm.TaskData.map(row => row.datasetId)).toEqual([9, 8])
  expect(vm.TaskData[0].dataSize).toBe(16909290)
  expect(vm.TaskData[1].status).toBe('DISABLED')
  expect(vm.TaskData[1].dataSize).toBeNull()
  expect(vm.storageNodes(vm.TaskData[0])).toBe('节点 #6、节点 #5')
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
  expect(fetchRegisteredDatasets).toHaveBeenLastCalledWith({ page: 1, pageSize: 5, query: '' }, { silent: true })
  fetchRegisteredDatasets.mockResolvedValueOnce({ list: [], total: 0 })
  await vm.fetchData(true)
  expect(vm.TaskData).toEqual([])
  expect(vm.total).toBe(0)
  expect(vm.dialogVisibleDetail).toBe(false)
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

it.each(['ACTIVE', 'DISABLED'])('updates %s through the registry using the logical ID', async(status) => {
  const vm = context()
  vm.fetchData = jest.fn().mockResolvedValue()
  await vm.toggleStatus({ ...dataset, status })
  const api = status === 'ACTIVE' ? disableDataset : activateDataset
  expect(api).toHaveBeenCalledWith(9)
  expect(vm.fetchData).toHaveBeenCalledTimes(1)
  expect(vm.$message.success).toHaveBeenCalledWith(status === 'ACTIVE' ? '数据集已停用' : '数据集已激活')
  expect(vm.pendingDatasetId).toBeNull()
})

it('surfaces activation failures without reporting success or changing the list', async() => {
  const vm = context()
  vm.TaskData = [{ ...dataset, status: 'DISABLED' }]
  activateDataset.mockRejectedValue(new Error('没有可用副本'))
  await vm.toggleStatus(vm.TaskData[0])
  expect(vm.$message.error).toHaveBeenCalledWith('没有可用副本')
  expect(vm.$message.success).not.toHaveBeenCalled()
  expect(vm.TaskData[0].status).toBe('DISABLED')
  expect(vm.pendingDatasetId).toBeNull()
})
