import DatasetRegistry from '@/views/RegistrationCenter/DatasetRegistry/index.vue'
import { createRegisteredTask, fetchRegisteredNodes, preflightRegisteredTask, unregisterDataset } from '@/api/registrationApi'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredNodes: jest.fn(),
  unregisterDataset: jest.fn(),
  verifyDataset: jest.fn(),
  activateDataset: jest.fn(),
  disableDataset: jest.fn(),
  preflightRegisteredTask: jest.fn(),
  createRegisteredTask: jest.fn()
}))

function context() {
  return {
    ...DatasetRegistry.data(),
    $message: { warning: jest.fn(), error: jest.fn(), success: jest.fn() },
    $confirm: jest.fn().mockResolvedValue('confirm'),
    load: jest.fn().mockResolvedValue()
  }
}

beforeEach(() => jest.resetAllMocks())

it('opens upload with a valid page size and only usable storage nodes', async() => {
  const vm = context()
  const storage = { nodeId: 1, role: 'STORAGE', schedulable: true }
  const combined = { nodeId: 2, role: 'COMPUTE_STORAGE', schedulable: true }
  fetchRegisteredNodes.mockResolvedValue({ list: [
    storage, combined,
    { nodeId: 3, role: 'COMPUTE', schedulable: true },
    { nodeId: 4, role: 'STORAGE', schedulable: false }
  ], total: 4 })

  await DatasetRegistry.methods.openUpload.call(vm)

  expect(fetchRegisteredNodes).toHaveBeenCalledWith({ page: 1, pageSize: 100, status: 'ACTIVE', enabled: true })
  expect(vm.uploadNodes).toEqual([storage, combined])
  expect(vm.uploadForm.nodeId).toBe(1)
  expect(vm.uploadDialog).toBe(true)
  expect(vm.$message.error).not.toHaveBeenCalled()
})

it('includes storage nodes beyond the first page of registered nodes', async() => {
  const vm = context()
  const storage = { nodeId: 101, role: 'STORAGE', schedulable: true }
  const nodes = Array.from({ length: 100 }, (_, index) => ({
    nodeId: index + 1, role: 'COMPUTE', schedulable: true
  })).concat(storage)
  fetchRegisteredNodes.mockImplementation(({ page, pageSize }) => Promise.resolve({
    list: nodes.slice((page - 1) * pageSize, page * pageSize), total: nodes.length
  }))

  await DatasetRegistry.methods.openUpload.call(vm)

  expect(fetchRegisteredNodes.mock.calls.map(call => call[0])).toEqual([
    { page: 1, pageSize: 100, status: 'ACTIVE', enabled: true },
    { page: 2, pageSize: 100, status: 'ACTIVE', enabled: true }
  ])
  expect(vm.uploadNodes).toEqual([storage])
  expect(vm.uploadDialog).toBe(true)
})

it('warns without opening upload when no storage nodes are available', async() => {
  const vm = context()
  fetchRegisteredNodes.mockResolvedValue({ list: [], total: 0 })

  await DatasetRegistry.methods.openUpload.call(vm)

  expect(vm.uploadDialog).toBe(false)
  expect(vm.$message.warning).toHaveBeenCalledWith('当前没有可用的存储节点')
})

it('reports a later-page failure without opening a partially loaded upload dialog', async() => {
  const vm = context()
  fetchRegisteredNodes.mockResolvedValueOnce({
    list: Array.from({ length: 100 }, (_, index) => ({ nodeId: index + 1, role: 'STORAGE', schedulable: true })),
    total: 101
  }).mockRejectedValueOnce(new Error('加载节点失败'))

  await DatasetRegistry.methods.openUpload.call(vm)

  expect(vm.uploadDialog).toBe(false)
  expect(vm.$message.error).toHaveBeenCalledWith('加载节点失败')
})

describe('default dataset name and code', () => {
  it.each([
    ['real-cifar-10-1.0.npz', 'real-cifar-10-1.0', 'real-cifar-10-1.0'],
    ['ciao.npz', 'ciao', 'ciao'],
    ['sales.2024.CSV', 'sales.2024', 'sales.2024'],
    ['archive.tar.gz', 'archive.tar', 'archive.tar'],
    ['snapshot-1.0', 'snapshot-1.0', 'snapshot-1.0'],
    ['患者 records.csv', '患者 records', '---records'],
    ['.npz', 'dataset', 'dataset'],
    [undefined, 'dataset', 'dataset']
  ])('registers candidate %s as name %s and code %s', (fileName, name, datasetCode) => {
    const vm = context()
    DatasetRegistry.methods.openRegister.call(vm, { candidateId: 5, fileName, fileType: 'NPZ' })
    expect(vm.form).toEqual({ candidateId: 5, datasetCode, name, version: '1.0', dataType: 'NPZ', description: '' })
    expect(vm.dialog).toBe(true)
  })

  it('fills the upload name and code without the file extension and keeps typed values', () => {
    const vm = context()
    const raw = { name: 'real-cifar-10-1.0.npz' }
    DatasetRegistry.methods.handleUploadFile.call(vm, { name: 'real-cifar-10-1.0.npz', raw }, [{ name: 'old.npz' }, { name: 'real-cifar-10-1.0.npz' }])
    expect(vm.uploadFile).toBe(raw)
    expect(vm.uploadFileList).toEqual([{ name: 'real-cifar-10-1.0.npz' }])
    expect(vm.uploadForm).toMatchObject({ datasetCode: 'real-cifar-10-1.0', name: 'real-cifar-10-1.0' })

    vm.uploadForm.name = '自定义名称'
    DatasetRegistry.methods.handleUploadFile.call(vm, { name: 'ciao.npz', raw: {}}, [{ name: 'ciao.npz' }])
    expect(vm.uploadForm).toMatchObject({ datasetCode: 'real-cifar-10-1.0', name: '自定义名称' })

    vm.uploadForm.datasetCode = ''
    vm.uploadForm.name = ''
    DatasetRegistry.methods.handleUploadFile.call(vm, { name: '患者 records.NPZ', raw: {}}, [{ name: '患者 records.NPZ' }])
    expect(vm.uploadForm).toMatchObject({ datasetCode: '---records', name: '患者 records' })
  })
})

describe('dataset deletion', () => {
  const row = { datasetId: 42, name: '测试数据', version: '1.0' }

  it('confirms the target and keeps source files before deleting and refreshing', async() => {
    const vm = context()
    vm.rows = [row]
    vm.selected = [row, { datasetId: 43 }]
    vm.page = 2
    await DatasetRegistry.methods.removeDataset.call(vm, row)

    expect(vm.$confirm).toHaveBeenCalledWith(expect.stringContaining('测试数据'), '删除数据集', expect.any(Object))
    expect(vm.$confirm.mock.calls[0][0]).toContain('ID: 42')
    expect(vm.$confirm.mock.calls[0][0]).toContain('保留节点上的原始文件')
    expect(unregisterDataset).toHaveBeenCalledWith(42)
    expect(vm.selected).toEqual([{ datasetId: 43 }])
    expect(vm.page).toBe(1)
    expect(vm.load).toHaveBeenCalledTimes(1)
    expect(vm.$message.success).toHaveBeenCalled()
    expect(vm.deletingDatasetId).toBeNull()
  })

  it.each(['cancel', 'close'])('does not delete when confirmation is dismissed with %s', async(action) => {
    const vm = context()
    vm.$confirm.mockRejectedValue(action)
    await DatasetRegistry.methods.removeDataset.call(vm, row)
    expect(unregisterDataset).not.toHaveBeenCalled()
    expect(vm.load).not.toHaveBeenCalled()
    expect(vm.$message.error).not.toHaveBeenCalled()
    expect(vm.deletingDatasetId).toBeNull()
  })

  it('keeps rows and selection when the backend rejects a referenced dataset', async() => {
    const vm = context()
    vm.rows = [row]
    vm.selected = [row]
    vm.page = 2
    unregisterDataset.mockRejectedValue(new Error('数据集被任务引用，无法删除'))
    await DatasetRegistry.methods.removeDataset.call(vm, row)
    expect(vm.$message.error).toHaveBeenCalledWith('数据集被任务引用，无法删除')
    expect(vm.rows).toEqual([row])
    expect(vm.selected).toEqual([row])
    expect(vm.page).toBe(2)
    expect(vm.load).not.toHaveBeenCalled()
    expect(vm.$message.success).not.toHaveBeenCalled()
    expect(vm.deletingDatasetId).toBeNull()
  })

  it('prevents duplicate deletions while confirmation is open', async() => {
    const vm = context()
    let confirm
    vm.$confirm.mockImplementation(() => new Promise(resolve => { confirm = resolve }))
    const first = DatasetRegistry.methods.removeDataset.call(vm, row)
    await DatasetRegistry.methods.removeDataset.call(vm, row)
    expect(vm.$confirm).toHaveBeenCalledTimes(1)
    expect(unregisterDataset).not.toHaveBeenCalled()
    confirm()
    await first
    expect(unregisterDataset).toHaveBeenCalledTimes(1)
  })
})

it('uses the same explicit execution mode and acceptance identity for preflight and creation', async() => {
  const vm = context()
  Object.entries(DatasetRegistry.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  vm.selected = [{ datasetId: 9 }, { datasetId: 10 }]
  vm.taskDialog = true
  vm.task = {
    taskName: 'judge-run centralized', runtimeImageId: 3, executionMode: 'CENTRALIZED',
    acceptanceRunId: 'judge-run-1', runRound: 2
  }
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  createRegisteredTask.mockResolvedValue({ taskId: 72 })

  await vm.createTask()

  const expected = {
    taskName: 'judge-run centralized', datasetIds: [9, 10], runtimeImageId: 3,
    executionMode: 'CENTRALIZED', acceptanceRunId: 'judge-run-1', runRound: 2
  }
  expect(preflightRegisteredTask).toHaveBeenCalledWith(expected)
  expect(createRegisteredTask).toHaveBeenCalledWith(expected)
  expect(vm.taskDialog).toBe(false)
})
