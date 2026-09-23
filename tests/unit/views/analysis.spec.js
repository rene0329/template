import Analyze from '@/views/ManagementCenter/Analyze/index.vue'
import { fetchAnalysisData } from '@/api/managementCenterApi'
import { fetchRegisteredTaskExecution, fetchTaskRunComparison } from '@/api/registrationApi'
jest.mock('echarts', () => ({ init: jest.fn() }))
jest.mock('@/api/managementCenterApi', () => ({ fetchAnalysisData: jest.fn() }))
jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredTaskExecution: jest.fn(), fetchTaskRunComparison: jest.fn()
}))
function context() {
  const vm = { ...Analyze.data(), $nextTick: fn => fn() }
  Object.entries(Analyze.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(Analyze.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { get: () => get.call(vm) }))
  return vm
}
beforeEach(() => jest.resetAllMocks())

it('keeps server search and pagination for the chart and clears data on errors', async() => {
  const vm = context()
  fetchAnalysisData.mockResolvedValue({ list: [{ taskId: 72, rating: 1.507 }], total: 16 })
  vm.formInline.name = ' 任务72 '
  vm.currentPage = 2
  await vm.onSearch()
  expect(fetchAnalysisData).toHaveBeenLastCalledWith(1, 10, '任务72')
  expect(vm.total).toBe(16)
  await vm.handleSizeChange(20)
  expect(fetchAnalysisData).toHaveBeenLastCalledWith(1, 20, '任务72')
  fetchAnalysisData.mockRejectedValue(new Error('offline'))
  await vm.handleCurrentChange(2)
  expect(vm.analysisData).toEqual([])
  expect(vm.error).toContain('加载失败')
  expect(vm.loading).toBe(false)
})

it('prevents a slow earlier request from replacing a newer search', async() => {
  const vm = context()
  let finishOld
  fetchAnalysisData.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve }))
    .mockResolvedValueOnce({ list: [{ taskId: 73, rating: 2 }], total: 1 })
  const oldRequest = vm.fetchData()
  await vm.onSearch()
  finishOld({ list: [{ taskId: 72, rating: 1 }], total: 99 })
  await oldRequest
  expect(vm.analysisData[0].taskId).toBe(73)
  expect(vm.total).toBe(1)
})

it('loads the paired raw measurements and the selected task event stream', async() => {
  const vm = context()
  vm.$message = { error: jest.fn() }
  vm.runLookup = { id: 'judge-run-1', round: 2 }
  fetchTaskRunComparison.mockResolvedValue({ centralizedTaskId: 10, inPlaceTaskId: 11, comparable: true })
  fetchRegisteredTaskExecution.mockResolvedValue({ taskId: 11, events: [{ eventType: 'INPUT_READY' }] })

  await vm.loadComparison()
  await vm.showEvidence(11)

  expect(fetchTaskRunComparison).toHaveBeenCalledWith('judge-run-1', 2)
  expect(vm.comparison.comparable).toBe(true)
  expect(fetchRegisteredTaskExecution).toHaveBeenCalledWith(11)
  expect(vm.evidence.events[0].eventType).toBe('INPUT_READY')
  expect(vm.evidenceVisible).toBe(true)
})

it('shows only the task id passed from data selection, matching it exactly across all pages', async() => {
  const vm = context()
  vm.focusTaskId = '142'
  fetchAnalysisData
    .mockResolvedValueOnce({ list: Array.from({ length: 100 }, (_, i) => ({ taskId: i + 1 })), total: 102 })
    .mockResolvedValueOnce({ list: [{ taskId: 1420 }, { taskId: 142, t1: 1.2, t2: 2.4, rating: 2, datasetIdsJson: '[1,2]' }], total: 102 })

  await vm.fetchData()

  expect(fetchAnalysisData.mock.calls).toEqual([[1, 100, ''], [2, 100, '']])
  expect(vm.analysisData.map(row => row.taskId)).toEqual([142])
  expect(vm.total).toBe(1)
  expect(vm.taskScopeLabel(vm.analysisData[0])).toBe('多数据集任务')
  expect(vm.focusText).toContain('仅显示任务 #142')
  expect(vm.loading).toBe(false)
})

it('keeps waiting for a focused task that has no measurements yet and refreshes it silently', async() => {
  const vm = context()
  vm.focusTaskId = '9'
  fetchAnalysisData.mockResolvedValue({ list: [{ taskId: 8, rating: 1 }], total: 1 })
  await vm.fetchData()
  expect(vm.analysisData).toEqual([])
  expect(vm.error).toBe('')
  expect(vm.focusText).toContain('任务 #9 暂无性能数据')

  fetchAnalysisData.mockResolvedValue({ list: [{ taskId: 9, t1: 1, t2: 1.5, rating: 1.5 }], total: 1 })
  await vm.refreshFocus()
  expect(vm.analysisData[0].taskId).toBe(9)
  expect(vm.loading).toBe(false)

  fetchAnalysisData.mockClear()
  expect(vm.refreshFocus()).toBeNull()
  vm.focusTaskId = ''
  vm.analysisData = []
  expect(vm.refreshFocus()).toBeNull()
  expect(fetchAnalysisData).not.toHaveBeenCalled()
})

it('reads taskId from the route and opens the historical pairing only for runId links', () => {
  const vm = context()
  vm.fetchData = jest.fn()
  vm.loadComparison = jest.fn()
  vm.$route = { query: { taskId: ' 42 ' }}
  Analyze.created.call(vm)
  expect(vm.focusTaskId).toBe('42')
  expect(vm.fetchData).toHaveBeenCalledTimes(1)
  expect(vm.loadComparison).not.toHaveBeenCalled()
  expect(vm.showRunLookup).toBe(false)

  const legacy = context()
  legacy.fetchData = jest.fn()
  legacy.loadComparison = jest.fn()
  legacy.$route = { query: { runId: 'judge-run-1', round: '2' }}
  Analyze.created.call(legacy)
  expect(legacy.focusTaskId).toBe('')
  expect(legacy.showRunLookup).toBe(true)
  expect(legacy.runLookup).toEqual({ id: 'judge-run-1', round: 2 })
  expect(legacy.loadComparison).toHaveBeenCalled()
})

it('leaves the task id view on search, reset or when showing all tasks', async() => {
  const vm = context()
  vm.$router = { push: jest.fn() }
  fetchAnalysisData.mockResolvedValue({ list: [], total: 0 })
  vm.focusTaskId = '42'
  vm.goToTaskList()
  expect(vm.$router.push).toHaveBeenCalledWith({ path: '/operations/tasks', query: { taskId: '42' }})

  vm.formInline.name = '对比任务'
  await vm.onSearch()
  expect(vm.focusTaskId).toBe('')
  expect(fetchAnalysisData).toHaveBeenLastCalledWith(1, 10, '对比任务')

  vm.focusTaskId = '42'
  await vm.onCancel()
  expect(vm.focusTaskId).toBe('')
  expect(fetchAnalysisData).toHaveBeenLastCalledWith(1, 10, '')

  vm.focusTaskId = '42'
  vm.currentPage = 3
  await vm.clearFocus()
  expect(vm.focusTaskId).toBe('')
  expect(vm.currentPage).toBe(1)
  expect(fetchAnalysisData).toHaveBeenLastCalledWith(1, 10, '')
})
