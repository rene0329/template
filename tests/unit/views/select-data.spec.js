import SelectData from '@/views/ManagementCenter/SelectData/index.vue'
import { createRegisteredTask, preflightRegisteredTask } from '@/api/registrationApi'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(), fetchRuntimeImages: jest.fn(), createRegisteredTask: jest.fn(),
  preflightRegisteredTask: jest.fn(), requestId: () => 'stable-request-key'
}))

const DENIED_MESSAGE = '任务创建失败，用户访问受限'

function context() {
  const vm = { ...SelectData.data(),
    $message: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
    $refs: { datasetTable: { clearSelection: jest.fn() }},
    $alert: jest.fn().mockResolvedValue(),
    $router: { push: jest.fn() }
  }
  Object.entries(SelectData.methods).forEach(([key, method]) => { vm[key] = method.bind(vm) })
  vm.selectedImageId = 9
  vm.selectedRows = [{ datasetId: 12 }, { datasetId: 3 }]
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('creates one COMPARISON task for all selected datasets with a single preflight and create', async() => {
  const vm = context()
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  createRegisteredTask.mockResolvedValue({ taskId: 77 })

  await vm.handleSubmit()

  expect(preflightRegisteredTask).toHaveBeenCalledTimes(1)
  expect(createRegisteredTask).toHaveBeenCalledTimes(1)
  const [body, key] = createRegisteredTask.mock.calls[0]
  expect(body).toEqual({
    taskName: expect.any(String), datasetIds: [3, 12], runtimeImageId: 9,
    executionMode: 'COMPARISON', acceptanceRunId: expect.stringMatching(/^cmp-/), runRound: 1
  })
  expect(body.taskName).toBe(`对比任务-${body.acceptanceRunId}`)
  expect(preflightRegisteredTask.mock.calls[0][0]).toEqual(body)
  expect(key).toBe('stable-request-key')
  expect(vm.submitResult).toEqual({ taskId: 77, datasetCount: 2 })
  expect(vm.$message.success).toHaveBeenCalledWith('已创建任务 #77：2 个数据集，按分布式与集中式两种模式调度')
  expect(vm.submitSummary(vm.submitResult)).toBe('已创建任务 #77：2 个数据集，按分布式与集中式两种模式调度')
  expect(vm.$refs.datasetTable.clearSelection).toHaveBeenCalled()
  expect(vm.selectedRows).toEqual([])
  expect(vm.pendingSubmission).toBeNull()
  expect(vm.submitting).toBe(false)
})

it('links the created task to the performance analysis page by task id', () => {
  const vm = context()
  vm.goToAnalysis()
  expect(vm.$router.push).not.toHaveBeenCalled()
  vm.submitResult = { taskId: 77, datasetCount: 2 }
  vm.goToAnalysis()
  expect(vm.$router.push).toHaveBeenCalledWith({ path: '/operations/analysis', query: { taskId: '77' }})
})

it('lists preflight failures grouped by execution mode', async() => {
  const vm = context()
  preflightRegisteredTask.mockResolvedValue({ valid: false, checks: [
    { available: true, name: 'ok', executionMode: 'IN_PLACE' },
    { available: false, name: 'central-node', message: 'central compute node is not available', executionMode: 'CENTRALIZED' },
    { available: false, name: 'ds-a', message: 'no in-place replica', executionMode: 'IN_PLACE' },
    { available: false, resourceType: 'COMPUTE_POOL', status: 'UNAVAILABLE', executionMode: null }
  ] })

  await vm.handleSubmit()

  expect(createRegisteredTask).not.toHaveBeenCalled()
  expect(vm.$alert).toHaveBeenCalledWith(
    'COMPUTE_POOL: UNAVAILABLE\n[分布式] ds-a: no in-place replica\n[集中式] central-node: central compute node is not available',
    '任务预检查未通过',
    { customClass: 'preflight-message' }
  )
  expect(vm.$message.error).not.toHaveBeenCalled()
  expect(vm.submitting).toBe(false)
})

it('shows only the access-restricted message when preflight reports DATASET_ACCESS_DENIED', async() => {
  const vm = context()
  preflightRegisteredTask.mockResolvedValue({ valid: false, executionMode: 'COMPARISON', checks: [
    { available: false, name: 'ds-a', message: 'no in-place replica', executionMode: 'IN_PLACE' },
    { available: false, name: 'secret', errorCode: 'DATASET_ACCESS_DENIED', message: 'forbidden', executionMode: null }
  ] })

  await vm.handleSubmit()

  expect(vm.$message.error).toHaveBeenCalledTimes(1)
  expect(vm.$message.error).toHaveBeenCalledWith(DENIED_MESSAGE)
  expect(vm.$alert).not.toHaveBeenCalled()
  expect(createRegisteredTask).not.toHaveBeenCalled()
  expect(vm.submitResult).toBeNull()
  expect(vm.pendingSubmission).toBeNull()
  expect(vm.submitting).toBe(false)
})

it('shows the access-restricted message when create is rejected with 403 DATASET_ACCESS_DENIED', async() => {
  const vm = context()
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  // Shape produced by src/api/axiosConfig.js apiError() for an ApiV1Response error body.
  createRegisteredTask.mockRejectedValue(Object.assign(new Error('dataset access denied: 12'), {
    status: 403, code: 403, errorCode: 'DATASET_ACCESS_DENIED'
  }))

  await vm.handleSubmit()

  expect(vm.$message.error).toHaveBeenCalledTimes(1)
  expect(vm.$message.error).toHaveBeenCalledWith(DENIED_MESSAGE)
  expect(vm.$message.success).not.toHaveBeenCalled()
  expect(vm.submitResult).toBeNull()
  expect(vm.pendingSubmission).toBeNull()
  expect(vm.selectedRows).toHaveLength(2)
})

it('also recognises the error code on a raw response body, including a rejected preflight', async() => {
  const vm = context()
  preflightRegisteredTask.mockRejectedValue({
    message: 'Request failed with status code 403',
    response: { status: 403, data: { code: 403, msg: 'forbidden', errorCode: 'DATASET_ACCESS_DENIED' }}
  })

  await vm.handleSubmit()

  expect(vm.$message.error).toHaveBeenCalledWith(DENIED_MESSAGE)
  expect(createRegisteredTask).not.toHaveBeenCalled()
})

it('keeps other errors, including other 403s, as their own message', async() => {
  const vm = context()
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  createRegisteredTask.mockRejectedValue(Object.assign(new Error('无权限'), { status: 403, code: 403, errorCode: 'FORBIDDEN' }))

  await vm.handleSubmit()

  expect(vm.$message.error).toHaveBeenCalledWith('无权限')
  expect(vm.$message.error).not.toHaveBeenCalledWith(DENIED_MESSAGE)
})

it('retries a failed create with the same request body and idempotency key without re-running preflight', async() => {
  const vm = context()
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  createRegisteredTask.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ taskId: 78 })

  await vm.handleSubmit()
  expect(vm.$message.error).toHaveBeenCalledWith('timeout')
  await vm.handleSubmit()

  expect(preflightRegisteredTask).toHaveBeenCalledTimes(1)
  expect(createRegisteredTask).toHaveBeenCalledTimes(2)
  expect(createRegisteredTask.mock.calls[1]).toEqual(createRegisteredTask.mock.calls[0])
  expect(vm.submitResult).toEqual({ taskId: 78, datasetCount: 2 })
})

it('asks for a runtime image before submitting', async() => {
  const vm = context()
  vm.selectedImageId = null
  await vm.handleSubmit()
  expect(vm.$message.warning).toHaveBeenCalledWith('请先选择运行镜像。')
  expect(preflightRegisteredTask).not.toHaveBeenCalled()
})
