import ManualScheduleDialog from '@/views/ManagementCenter/DataManagement/ManualScheduleDialog.vue'
import { fetchRegisteredNodes, fetchRuntimeImages, requestId } from '@/api/registrationApi'
import { fetchSchedulableDatasets, fetchSchedulingPlan, submitDatasetSchedule, submitComputeSchedule } from '@/api/schedulingApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredNodes: jest.fn(), fetchRuntimeImages: jest.fn(), requestId: jest.fn() }))
jest.mock('@/api/schedulingApi', () => ({ fetchSchedulableDatasets: jest.fn(), fetchSchedulingPlan: jest.fn(), submitDatasetSchedule: jest.fn(), submitComputeSchedule: jest.fn() }))

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
const algorithm = { name: '手动数据调度', version: '1.0' }

function context() {
  const vm = { ...ManualScheduleDialog.data(), $emit: jest.fn(), $confirm: jest.fn().mockResolvedValue(), $router: { push: jest.fn() }}
  Object.entries(ManualScheduleDialog.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(ManualScheduleDialog.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { get: get.bind(vm) }))
  return vm
}

async function chooseTarget(vm, nodeId) {
  vm.form.targetNodeId = nodeId
  vm.syncTarget()
  if (vm.withCompute) await vm.loadImages()
}

beforeEach(() => {
  jest.resetAllMocks()
  fetchSchedulableDatasets.mockResolvedValue({ list: [{ datasetId: 9, replicas: [replica, { replicaId: 20, availability: 'MISSING' }] }], total: 1 })
  fetchRegisteredNodes.mockResolvedValue({ list: nodes, total: nodes.length })
  requestId.mockReturnValueOnce('one').mockReturnValueOnce('two')
  submitDatasetSchedule.mockResolvedValue({ planId: 42, status: 'ACCEPTED' })
  submitComputeSchedule.mockResolvedValue({ planId: 43, externalPlanId: 'manual-one', taskId: 'manual-one', status: 'ACCEPTED' })
  fetchSchedulingPlan.mockResolvedValue({ plan: { planId: 43, taskId: 'manual-one', internalTaskId: 77 }, assignments: [] })
  fetchRuntimeImages.mockResolvedValue({ list: images, total: images.length })
})

it('loads fresh eligible resources by logical ID and asks for a target node first', async() => {
  const vm = context()
  await vm.open(dataset)
  expect(fetchSchedulableDatasets).toHaveBeenCalledWith({ datasetIds: '9', page: 1, pageSize: 1 })
  expect(vm.replicas).toEqual([replica])
  expect(vm.nodes.map(node => node.nodeId)).toEqual([6, 3, 2])
  expect(fetchRuntimeImages).not.toHaveBeenCalled()
  expect(vm.form).toEqual({ targetNodeId: null, replicaId: 19, action: 'COPY', compute: false, runtimeImageId: null })
  expect(vm.targetNodes.map(node => node.nodeId)).toEqual([3])
  expect(vm.canSubmit).toBe(false)
  await chooseTarget(vm, 3)
  expect(vm.inPlace).toBe(false)
  expect(vm.withCompute).toBe(false)
  expect(vm.canSubmit).toBe(true)
})

it('submits a pure data copy and reports acceptance without a compute task', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledWith({
    externalPlanId: 'manual-one', algorithm,
    assignments: [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 3, action: 'COPY' }]
  })
  expect(submitComputeSchedule).not.toHaveBeenCalled()
  expect(fetchSchedulingPlan).not.toHaveBeenCalled()
  expect(vm.acceptedPlan).toEqual({ planId: 42, status: 'ACCEPTED' })
  expect(vm.computeTask).toBeNull()
  expect(vm.acceptedMessage).toBe('调度计划 #42 已提交，请到调度日志查看执行结果。')
  expect(vm.$emit).toHaveBeenCalledWith('submitted', vm.acceptedPlan)
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledTimes(1)
  vm.viewLogs()
  expect(vm.$router.push).toHaveBeenCalledWith({ name: 'SchedulingLogs' })
})

it('retains the same plan on uncertain retries but gives changed assignments a new identity', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
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
  await chooseTarget(vm, 3)
  let resolve
  submitDatasetSchedule.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const pending = vm.submit()
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledTimes(1)
  resolve({ planId: 42 })
  await pending
  expect(vm.submitting).toBe(false)
})

it('requires confirmation for a pure data move and submits nothing when cancelled', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.action = 'MOVE'
  vm.$confirm.mockRejectedValueOnce('cancel')
  await vm.submit()
  expect(vm.$confirm.mock.calls[0][0]).toContain('删除源文件')
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(vm.submitError).toBe('')
  expect(vm.submitting).toBe(false)
  await vm.submit()
  expect(submitDatasetSchedule).toHaveBeenCalledWith({
    externalPlanId: 'manual-one', algorithm,
    assignments: [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 3, action: 'MOVE' }]
  })
})

it('offers the compute option only for compute-capable targets and clears it on a storage-only target', async() => {
  fetchRegisteredNodes.mockResolvedValue({ list: [...nodes, { nodeId: 8, schedulable: true, role: 'STORAGE' }], total: 5 })
  const vm = context()
  await vm.open(dataset)
  expect(vm.targetNodes.map(node => node.nodeId)).toEqual([3, 8])
  expect(vm.targetLabel(vm.targetNodes[0])).toContain('可计算')
  expect(vm.targetLabel(vm.targetNodes[1])).not.toContain('可计算')
  await chooseTarget(vm, 8)
  expect(vm.computeNode).toBeNull()
  expect(vm.targetHint).toContain('仅提供存储')
  vm.form.compute = true
  vm.syncTarget()
  expect(vm.form.compute).toBe(false)
  expect(vm.withCompute).toBe(false)
  expect(fetchRuntimeImages).not.toHaveBeenCalled()
  await chooseTarget(vm, 3)
  expect(vm.computeNode.nodeId).toBe(3)
  expect(vm.withCompute).toBe(false)
  vm.form.compute = true
  vm.syncImage()
  expect(fetchRuntimeImages).toHaveBeenCalledWith({ page: 1, pageSize: 100, status: 'READY', enabled: true })
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  await chooseTarget(vm, 8)
  expect(vm.form.compute).toBe(false)
  expect(vm.form.runtimeImageId).toBeNull()
  await vm.submit()
  expect(submitComputeSchedule).not.toHaveBeenCalled()
  expect(submitDatasetSchedule.mock.calls[0][0].assignments[0]).toEqual({ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 8, action: 'COPY' })
})

it('keeps a storage-only node that already holds the data out of the targets', async() => {
  const vm = context()
  await vm.open(dataset)
  vm.form.targetNodeId = 6
  vm.syncTarget()
  expect(vm.form.targetNodeId).toBeNull()
  expect(vm.canSubmit).toBe(false)
})

it.each(['COPY_AND_USE', 'MOVE_AND_USE', 'USE_IN_PLACE', 'REMOTE_READ'])('rejects actions other than copy or move for a transfer target: %s', async(action) => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.action = action
  expect(vm.canSubmit).toBe(false)
  await vm.submit()
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(submitComputeSchedule).not.toHaveBeenCalled()
})

it('explains an unsupported data endpoint without falling back to compute scheduling', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
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
  expect(vm.unavailableReason).toContain('没有可用的目标节点')
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

it.each(['COPY', 'MOVE'])('submits %s plus computation as a compute plan and shows the numeric task ID', async(action) => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.action = action
  vm.form.compute = true
  vm.syncImage()
  await vm.loadImages()
  expect(vm.canSubmit).toBe(false)
  vm.form.runtimeImageId = 7
  expect(vm.canSubmit).toBe(true)
  await vm.submit()
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(submitComputeSchedule).toHaveBeenCalledWith({
    externalPlanId: 'manual-one', taskId: 'manual-one', runtimeImageId: 7, algorithm,
    assignments: [{ datasetId: 9, replicaId: 19, sourceNodeId: 6, targetNodeId: 3, action: `${action}_AND_USE` }]
  })
  expect(vm.$confirm).toHaveBeenCalledTimes(action === 'MOVE' ? 1 : 0)
  expect(fetchSchedulingPlan).toHaveBeenCalledWith(43)
  expect(vm.computeTask).toEqual({ taskId: 77 })
  expect(vm.acceptedMessage).toBe('计算调度已提交，任务 ID：#77（调度计划 #43）')
  expect(vm.$emit).toHaveBeenCalledWith('submitted', vm.acceptedPlan)
})

it('computes in place when the target already holds a replica, without copy, move or confirmation', async() => {
  const vm = context()
  await vm.open(dataset)
  const local = { ...replica, replicaId: 21, nodeId: 3 }
  vm.replicas = [replica, local]
  expect(vm.targetNodes.map(node => node.nodeId)).toEqual([3])
  expect(vm.targetLabel(vm.targetNodes[0])).toContain('原位计算')
  vm.form.action = 'MOVE'
  vm.form.targetNodeId = 3
  vm.syncTarget()
  expect(vm.inPlace).toBe(true)
  expect(vm.withCompute).toBe(true)
  expect(vm.sourceReplicas).toEqual([local])
  expect(vm.form.replicaId).toBe(21)
  expect(fetchRuntimeImages).toHaveBeenCalled()
  await vm.loadImages()
  expect(vm.canSubmit).toBe(false)
  vm.form.runtimeImageId = 7
  expect(vm.unavailableReason).toBe('')
  expect(vm.canSubmit).toBe(true)
  await vm.submit()
  expect(submitComputeSchedule).toHaveBeenCalledWith({
    externalPlanId: 'manual-one', taskId: 'manual-one', runtimeImageId: 7, algorithm,
    assignments: [{ datasetId: 9, replicaId: 21, sourceNodeId: 3, targetNodeId: 3, action: 'USE_IN_PLACE' }]
  })
  expect(vm.$confirm).not.toHaveBeenCalled()
  expect(submitDatasetSchedule).not.toHaveBeenCalled()
  expect(vm.acceptedMessage).toBe('计算调度已提交，任务 ID：#77（调度计划 #43）')
})

it('keeps a valid source replica and makes compute opt-in again when leaving an in-place target', async() => {
  fetchRegisteredNodes.mockResolvedValue({ list: [...nodes, { nodeId: 5, schedulable: true, role: 'COMPUTE_STORAGE' }], total: 5 })
  const vm = context()
  await vm.open(dataset)
  vm.replicas = [replica, { ...replica, replicaId: 21, nodeId: 3 }]
  await chooseTarget(vm, 3)
  expect(vm.form.replicaId).toBe(21)
  vm.form.runtimeImageId = 7
  await chooseTarget(vm, 5)
  expect(vm.inPlace).toBe(false)
  expect(vm.sourceReplicas.map(item => item.replicaId)).toEqual([19, 21])
  expect(vm.form.replicaId).toBe(21)
  expect(vm.withCompute).toBe(false)
  expect(vm.form.runtimeImageId).toBeNull()
})

it('reads the numeric task ID from the accepted response when the backend provides it', async() => {
  submitComputeSchedule.mockResolvedValue({ planId: 43, externalPlanId: 'manual-one', taskId: 'manual-one', internalTaskId: 88, status: 'ACCEPTED' })
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.compute = true
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  await vm.submit()
  expect(fetchSchedulingPlan).not.toHaveBeenCalled()
  expect(vm.computeTask).toEqual({ taskId: 88 })
  expect(vm.acceptedMessage).toBe('计算调度已提交，任务 ID：#88（调度计划 #43）')
})

it('still reports an accepted compute plan when the task ID lookup fails', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.compute = true
  await vm.loadImages()
  vm.form.runtimeImageId = 7
  fetchSchedulingPlan.mockRejectedValueOnce(new Error('offline'))
  await vm.submit()
  expect(vm.submitError).toBe('')
  expect(vm.acceptedPlan.planId).toBe(43)
  expect(vm.computeTask).toEqual({ taskId: null })
  expect(vm.acceptedMessage).toContain('任务 ID 暂未获取')
  expect(vm.$emit).toHaveBeenCalledWith('submitted', vm.acceptedPlan)
})

it('filters unverified or disabled images and keeps data-only scheduling available if images fail', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.compute = true
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
  vm.form.compute = false
  vm.syncImage()
  expect(vm.form.runtimeImageId).toBeNull()
  expect(vm.canSubmit).toBe(true)
})

it('uses a new plan identity when the selected image changes and retains it on retries', async() => {
  const vm = context()
  await vm.open(dataset)
  await chooseTarget(vm, 3)
  vm.form.compute = true
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
  expect(fetchSchedulingPlan).not.toHaveBeenCalled()
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
