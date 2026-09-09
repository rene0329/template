import Analyze from '@/views/ManagementCenter/Analyze/index.vue'
import { fetchAnalysisData } from '@/api/managementCenterApi'
jest.mock('echarts', () => ({ init: jest.fn() }))
jest.mock('@/api/managementCenterApi', () => ({ fetchAnalysisData: jest.fn() }))
function context() {
  const vm = { ...Analyze.data(), $nextTick: fn => fn() }
  Object.entries(Analyze.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
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
