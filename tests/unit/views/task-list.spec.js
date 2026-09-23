import TaskList from '@/views/ManagementCenter/TaskList/index.vue'
import { fetchTaskList } from '@/api/managementCenterApi'

jest.mock('@/api/managementCenterApi', () => ({ fetchTaskList: jest.fn(), updateTask: jest.fn(), deleteTask: jest.fn() }))

function context() {
  const vm = { ...TaskList.data(), $message: { error: jest.fn() }}
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
