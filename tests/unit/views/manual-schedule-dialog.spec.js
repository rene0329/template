import ManualScheduleDialog from '@/views/ManagementCenter/DataManagement/ManualScheduleDialog.vue'
import { fetchRegisteredNodes, fetchRuntimeImages, requestId } from '@/api/registrationApi'
import { fetchSchedulableDatasets, submitDatasetSchedule, submitComputeSchedule } from '@/api/schedulingApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredNodes: jest.fn(), fetchRuntimeImages: jest.fn(), requestId: jest.fn() }))
jest.mock('@/api/schedulingApi', () => ({ fetchSchedulableDatasets: jest.fn(), submitDatasetSchedule: jest.fn(), submitComputeSchedule: jest.fn() }))

const dataset = { datasetId: 9, dataId: 99, name: '测试数据', defaultRuntimeImageId: null }
const replica = { replicaId: 19, nodeId: 6, availability: 'AVAILABLE', filePath: '/dataset/test.npz' }
const nodes = [
  { nodeId: 6, schedulable: true, role: 'STORAGE' },
  { nodeId: 3, schedulable: true, role: 'COMPUTE_STORAGE' },
  { nodeId: 4, schedulable: false, role: 'STORAGE' },
  { nodeId: 2, schedulable: true, role: 'COMPUTE' }
]
const images = [
  { imageId: 7, name: '计算镜像', imageRef: 'example:v1', status: 'READY', enabled: true, resolvedDigest: 'sha256:one' },
  { imageId: 8, name: '其他镜像', imageRef: 'example:v2', status: 'READY', enabled: true, resolvedDigest: 'sha256:two' }
]

function context() {
  const vm = { ...ManualScheduleDialog.data(), $emit: jest.fn(), $confirm: jest.fn().mockResolvedValue(), $router: { push: jest.fn() }}
  Object.entries(ManualScheduleDialog.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(ManualScheduleDialog.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { get: get.bind(vm) }))
  return vm
}

beforeEach(() => {
  jest.resetAllMocks()
  fetchSchedulableDatasets.mockResolvedValue({ list: [{ datasetId: 9, replicas: [replica, { replicaId: 20, availability: 'MISSING' }] }], total: 1 })
  fetchRegisteredNodes.mockResolvedValue({ list: nodes, total: nodes.length })
  requestId.mockReturnValueOnce('one').mockReturnValueOnce('two')
  submitDatasetSchedule.mockResolvedValue({ planId: 42, status: 'ACCEPTED' })
  submitComputeSchedule.mockResolvedValue({ planId: 43, status: 'ACCEPTED' })
  fetchRuntimeImages.mockResolvedValue({ list: images, total: images.length })
})

it('loads fresh eligible resources by logical ID and defaults to non-destructive copy', async() => {
  const vm = context()
  await vm.open(dataset)
  expect(fetchSchedulableDatasets).toHaveBeenCalledWith({ datasetIds: '9', page: 1, pageSize: 1 })
  expect(vm.replicas).toEqual([replica])
  expect(vm.nodes.map(node => node.nodeId)).toEqual([6, 3, 2])
  expect(fetchRuntimeImages).not.toHaveBeenCalled()
  expect(vm.form).toEqual({ replicaId: 19, targetNodeId: null, action: 'COPY', runtimeImageId: null })
  expect(vm.targetNodes.map(node => node.nodeId)).toEqual([3])
  expect(vm.canSubmit).toBe(false)
  vm.form.targetNodeId = 3
  expect(vm.canSubmit).toBe(true)
})

it('submits an explicit assignment and reports acceptance, not completion', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledWith({
    externalPlanId: 'manual-one', algorithm: { name: '手动数据调度', version: '1.0' },
    assignments: [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 3, action: 'COPY' }]
  })
  expect(vm.acceptedPlan).toEqual({ planId: 42, status: 'ACCEPTED' })
  expect(vm.$emit).toHaveBeenCalledWith('submitted', vm.acceptedPlan)
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledTimes(1)
  vm.viewLogs()
  expect(vm.$router.push).toHaveBeenCalledWith({ name: 'SchedulingLogs' })
})

it('retains the same plan on uncertain retries but gives changed assignments a new identity', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  submitDatasetSchedule.mockRejectedValue(new Error('Network Error'))
  await vm.submit()
  expect(vm.submitError).toContain('Network Error')
  expect(vm.acceptedPlan).toBeNull()
  expect(vm.$emit).not.toHaveBeenCalled()
  await vm.submit()
  expect(submitDatasetSchedule.mock.calls[1][0]).toBe(submitDatasetSchedule.mock.calls[0][0])
  vm.form.action = 'MOVE'
  await vm.submit()
  expect(submitDatasetSchedule.mock.calls[2][0].externalPlanId).toBe('manual-two')
})

it('prevents duplicate clicks while a request is pending', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  let resolve
  submitDatasetSchedule.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const pending = vm.submit()
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledTimes(1)
  resolve({ planId: 42 })
  await pending
  expect(vm.submitting).toBe(false)
})

it('requires confirmation for moves and submits nothing when cancelled', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  vm.form.action = 'MOVE'
  vm.$confirm.mockRejectedValueOnce('cancel')
  await vm.submit()
  expect(vm.$confirm.mock.calls[0][0]).toContain('删除源文件')
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(vm.submitError).toBe('')
  expect(vm.submitting).toBe(false)
  await vm.submit()
  expect(submitDatasetSchedule.mock.calls[0][0].assignments[0].action).toBe('MOVE')
})

it('offers in-place compute and clears a target that becomes the source', async() => {
  const vm = context()
  await vm.open(dataset)
  expect(vm.actions.map(action => action.value)).toEqual(['COPY', 'MOVE', 'USE_IN_PLACE'])
  vm.form.targetNodeId = 3
  vm.replicas = [{ ...replica, nodeId: 3 }]
  vm.syncTarget()
  expect(vm.form.targetNodeId).toBeNull()
})

it.each(['COPY_AND_USE', 'MOVE_AND_USE', 'USE_IN_PLACE', 'REMOTE_READ'])('rejects unsupported actions or in-place compute on a storage-only source: %s', async(action) => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  vm.form.action = action
  expect(vm.canSubmit).toBe(false)
  await vm.submit()
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(submitComputeSchedule).not.toHaveBeenCalled()
})

it('explains an unsupported data endpoint without falling back to compute scheduling', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  submitDatasetSchedule.mockRejectedValue({ status: 404, message: 'Not Found' })
  await vm.submit()
  expect(vm.submitError).toContain('当前后端尚未支持此调度接口')
  expect(submitDatasetSchedule).toHaveBeenCalledTimes(1)
  expect(vm.acceptedPlan).toBeNull()
})

it('blocks missing or inactive datasets, unavailable targets, and failed resource loads', async() => {
  const vm = context()
  fetchSchedulableDatasets.mockResolvedValueOnce({ list: [], total: 0 })
  await vm.open(dataset)
  expect(vm.unavailableReason).toContain('没有可调度副本')
  expect(vm.canSubmit).toBe(false)
  fetchRegisteredNodes.mockResolvedValueOnce({ list: [nodes[0]], total: 1 })
  await vm.open(dataset)
  expect(vm.unavailableReason).toContain('没有可用的目标存储节点')
  fetchRegisteredNodes.mockRejectedValueOnce(new Error('offline'))
  await vm.open(dataset)
  expect(vm.loadError).toContain('offline')
  expect(vm.canSubmit).toBe(false)
  await vm.loadOptions()
  expect(vm.loadError).toBe('')
  expect(vm.nodes).toHaveLength(3)
})

it('ignores a resource response after closing the dialog', async() => {
  const vm = context()
  let resolve
  fetchSchedulableDatasets.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const pending = vm.open(dataset)
  vm.close()
  resolve({ list: [{ datasetId: 9, replicas: [replica] }], total: 1 })
  await pending
  expect(vm.replicas).toEqual([])
})

it.each(['COPY', 'MOVE'])('uses the selected image for %s followed by computation', async(action) => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  vm.form.action = action
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  expect(vm.computeNode.nodeId).toBe(3)
  await vm.submit()
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(submitComputeSchedule).toHaveBeenCalledWith({
    externalPlanId: 'manual-one', taskId: 'manual-one', runtimeImageId: 7,
    algorithm: { name: '手动数据调度', version: '1.0' },
    assignments: [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 3, action: `${action}_AND_USE` }]
  })
})

it('computes in place on the source without requiring another storage node', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.replicas = [{ ...replica, nodeId: 3 }]
  vm.nodes = [nodes[1]]
  vm.form.action = 'USE_IN_PLACE'
  vm.syncTarget()
  expect(vm.canSubmit).toBe(false)
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  expect(vm.unavailableReason).toBe('')
  expect(vm.canSubmit).toBe(true)
  await vm.submit()
  expect(submitComputeSchedule.mock.calls[0][0].assignments[0]).toEqual({
    datasetId: 9, replicaId: 19, sourceNodeId: 3, targetNodeId: 3, action: 'USE_IN_PLACE'
  })
  expect(vm.$confirm).not.toHaveBeenCalled()
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
})

it('loads images only for compute nodes and clears the image when changing to storage only', async() => {
  const vm = context()
  await vm.open(dataset)
  expect(fetchRuntimeImages).not.toHaveBeenCalled()
  vm.form.targetNodeId = 3
  vm.syncImage()
  expect(fetchRuntimeImages).toHaveBeenCalledWith({ page: 1, pageSize: 100, status: 'READY', enabled: true })
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  vm.nodes.push({ nodeId: 8, role: 'STORAGE', schedulable: true })
  vm.form.targetNodeId = 8
  vm.syncImage()
  expect(vm.computeNode).toBeNull()
  expect(vm.form.runtimeImageId).toBeNull()
  await vm.submit()
  expect(submitDatasetSchedule.mock.calls[0][0].assignments[0].action).toBe('COPY')
})

it('filters unverified or disabled images and keeps data-only scheduling available if images fail', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  const invalid = [{ ...images[0], enabled: false }, { ...images[0], status: 'INVALID' }, { ...images[0], resolvedDigest: null }]
  fetchRuntimeImages.mockResolvedValueOnce({ list: invalid, total: invalid.length })
  await vm.loadImages()
  expect(vm.images).toEqual([])
  vm.form.runtimeImageId = 7
  expect(vm.canSubmit).toBe(false)
  fetchRuntimeImages.mockRejectedValueOnce(new Error('offline'))
  await vm.loadImages()
  expect(vm.imageError).toContain('offline')
  expect(vm.canSubmit).toBe(false)
  vm.form.runtimeImageId = null
  expect(vm.canSubmit).toBe(true)
})

it('uses a new plan identity when the selected image changes and retains it on retries', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 3
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  submitComputeSchedule.mockRejectedValue(new Error('Network Error'))
  await vm.submit()
  await vm.submit()
  expect(submitComputeSchedule.mock.calls[1][0]).toBe(submitComputeSchedule.mock.calls[0][0])
  vm.form.runtimeImageId = 8
  await vm.submit()
  expect(submitComputeSchedule.mock.calls[2][0].externalPlanId).toBe('manual-two')
  expect(submitComputeSchedule.mock.calls[2][0].runtimeImageId).toBe(8)
})

it('ignores late image responses after the dialog closes', async() => {
  const vm = context()
  await vm.open(dataset)
  let finish
  fetchRuntimeImages.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const pending = vm.loadImages()
  vm.close()
  finish({ list: images, total: images.length })
  await pending
  expect(vm.images).toEqual([])
})

it('shows the bound default image first with its task and model type without auto-starting compute', async() => {
  const vm = context()
  await vm.open({ ...dataset, defaultRuntimeImageId: 8 })
  const catalog = images.map(image => ({ ...image, taskType: 'text', modelType: 'gru' }))
  fetchRuntimeImages.mockResolvedValueOnce({ list: catalog, total: catalog.length })
  await vm.loadImages()
  expect(vm.images.map(image => image.imageId)).toEqual([8, 7])
  expect(vm.imageLabel(vm.images[0])).toBe('【数据集默认】其他镜像（text / gru） · example:v2')
  expect(vm.imageLabel(vm.images[1])).not.toContain('数据集默认')
  expect(vm.form.runtimeImageId).toBeNull()
  expect(submitComputeSchedule).not.toHaveBeenCalled()
})
