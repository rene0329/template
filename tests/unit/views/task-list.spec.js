import TaskList from '@/views/ManagementCenter/TaskList/index.vue'
import { fetchTaskList } from '@/api/managementCenterApi'
import { fetchRegisteredTaskJobs, cancelRegisteredTask } from '@/api/registrationApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredTaskJobs: jest.fn(), cancelRegisteredTask: jest.fn() }))

jest.mock('@/api/managementCenterApi', () => ({ fetchTaskList: jest.fn(), updateTask: jest.fn(), deleteTask: jest.fn() }))

function context() {
  const vm = { ...TaskList.data(), $message: { error: jest.fn(), success: jest.fn() }, $confirm: jest.fn(), $store: { getters: { roles: ['ADMIN'] }}}
  Object.entries(TaskList.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('lists every participating dataset of a task in one cell', async() => {
  const vm = context()
  const comparison = { taskId: 3, selectedData: '[iris, mnist]', datasetIdsJson: '[1,2]', executionMode: 'COMPARISON', status: '执行中' }
  const single = { taskId: 4, selectedData: '[iris]', datasetIdsJson: '[1]', executionMode: 'COMPARISON', status: '已完成' }
  const historical = { taskId: 1, selectedData: '[mnist]', datasetIdsJson: null, executionMode: 'IN_PLACE', status: '已完成' }
  fetchTaskList.mockResolvedValue({ list: [comparison, single, historical], total: 3 })

  await vm.fetchData()

  expect(vm.TaskData).toHaveLength(3)
  expect(vm.datasetText(comparison)).toBe('iris、mnist')
  expect(vm.datasetText(single)).toBe('iris')
  expect(vm.datasetText(historical)).toBe('mnist')
  expect(vm.taskScopeLabel).toBeUndefined()
  expect(vm.executionModeLabel).toBeUndefined()
  expect(vm.datasetText({ selectedData: '' })).toBe('—')
})

it('discards stale job details after another task is selected or the dialog closes', async() => {
  const vm = context()
  let finishFirst
  fetchRegisteredTaskJobs.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    .mockResolvedValueOnce([{ id: 2, state: 'WAITING', waitingReason: 'CPU不足' }])
  vm.jobsVisible = true
  vm.jobsTaskId = 1
  const first = vm.loadJobs()
  vm.jobsTaskId = 2
  await vm.loadJobs()
  finishFirst([{ id: 1, state: 'RUNNING' }])
  await first
  expect(vm.jobs).toEqual([{ id: 2, state: 'WAITING', waitingReason: 'CPU不足' }])
  expect(vm.jobsLoading).toBe(false)
  vm.closeJobs()
  expect(vm.jobsVisible).toBe(false)
})

it('does not report cancellation as completed before the backend stops the jobs', async() => {
  const vm = context()
  vm.jobsVisible = true
  vm.jobsTaskId = 3
  vm.$confirm.mockResolvedValue()
  cancelRegisteredTask.mockResolvedValue()
  fetchRegisteredTaskJobs.mockResolvedValue([{ id: 5, state: 'CANCELLING' }])
  vm.fetchData = jest.fn()
  await vm.cancelJobs()
  expect(cancelRegisteredTask).toHaveBeenCalledWith(3)
  expect(vm.jobs[0].state).toBe('CANCELLING')
  expect(vm.$message.success).toHaveBeenCalledWith('已提交取消请求，作业停止后将显示已取消')
  expect(TaskList.computed.jobsCanCancel.call(vm)).toBe(false)
  expect(vm.jobsCancelling).toBe(false)
})

it('does not cancel a different task if the selection changes during confirmation', async() => {
  const vm = context()
  vm.jobsVisible = true
  vm.jobsTaskId = 3
  vm.$confirm.mockImplementation(async() => { vm.jobsTaskId = 4 })
  await vm.cancelJobs()
  expect(cancelRegisteredTask).not.toHaveBeenCalled()
})

it('distinguishes waiting, preparing, computing and cancelling, and marks an unbound node', () => {
  const vm = context()
  expect(vm.jobStatusLabel('WAITING')).toBe('等待资源')
  expect(vm.jobStatusLabel('PREPARING')).toBe('数据准备中')
  expect(vm.jobStatusLabel('RUNNING')).toBe('计算中')
  expect(vm.jobStatusLabel('CANCELLING')).toBe('取消中')
  expect(vm.jobNodeText({ targetNode: 'node-a' })).toBe('node-a（待确认）')
  expect(vm.jobNodeText({ targetNode: 'node-a', boundAt: '2026-11-08T10:00:00' })).toBe('node-a')
})

it('does not offer or send cancellation for a domain user without administrator rights', async() => {
  const vm = context()
  vm.$store.getters.roles = ['DATA_OWNER']
  vm.jobs = [{ state: 'RUNNING' }]
  expect(TaskList.computed.jobsCanCancel.call(vm)).toBe(false)
  await vm.cancelJobs()
  expect(cancelRegisteredTask).not.toHaveBeenCalled()
})

it('keeps only the latest polling session when the same task is reopened before loading finishes', async() => {
  jest.useFakeTimers()
  const vm = context()
  let finishFirst
  fetchRegisteredTaskJobs.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    .mockResolvedValueOnce([])
  const first = vm.openJobs({ taskId: 5 })
  await vm.openJobs({ taskId: 5 })
  const timer = vm.jobsPollingTimer
  finishFirst([])
  await first
  expect(vm.jobsPollingTimer).toBe(timer)
  vm.closeJobs()
  jest.clearAllTimers()
  jest.useRealTimers()
})
