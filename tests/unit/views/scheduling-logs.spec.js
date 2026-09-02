import SchedulingLogs from '@/views/ManagementCenter/SchedulingLogs/index.vue'
import { fetchSchedulingPlans, fetchSchedulingPlan } from '@/api/schedulingApi'

jest.mock('@/api/schedulingApi', () => ({ fetchSchedulingPlans: jest.fn(), fetchSchedulingPlan: jest.fn() }))

function context() {
  const vm = SchedulingLogs.data()
  Object.entries(SchedulingLogs.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('groups partial execution under failed without offering a partial-completed filter', () => {
  const vm = context()
  expect(vm.planStatuses).toEqual(['ACCEPTED', 'RUNNING', 'COMPLETED', 'FAILED'])
  expect(vm.statusLabel('PARTIAL_COMPLETED')).toBe('失败')
  expect(vm.statusType('PARTIAL_COMPLETED')).toBe('danger')
  expect(vm.statusLabel('COMPLETED')).toBe('已完成')
})

it('loads external plans with server pagination and search/status filters', async() => {
  const vm = context()
  const plan = { planId: 42, externalPlanId: 'external-42', status: 'FAILED' }
  fetchSchedulingPlans.mockResolvedValue({ list: [plan], total: 13 })
  vm.filters = { query: ' external-42 ', status: 'FAILED' }
  vm.page = 2
  await vm.load()
  expect(fetchSchedulingPlans).toHaveBeenCalledWith({ page: 2, pageSize: 10, query: 'external-42', status: 'FAILED' })
  expect(vm.plans).toEqual([plan])
  expect(vm.total).toBe(13)
  expect(vm.loading).toBe(false)
  await vm.search()
  expect(vm.page).toBe(1)
  await vm.changePage(2)
  expect(vm.page).toBe(2)
  await vm.changeSize(20)
  expect(vm.page).toBe(1)
  expect(vm.pageSize).toBe(20)
  await vm.reset()
  expect(vm.filters).toEqual({ query: '', status: '' })
})

it('keeps empty results separate from failed requests', async() => {
  const vm = context()
  fetchSchedulingPlans.mockResolvedValueOnce({ list: [], total: 0 }).mockRejectedValueOnce(new Error('offline'))
  await vm.load()
  expect(vm.plans).toEqual([])
  expect(vm.error).toBe('')
  await vm.load()
  expect(vm.error).toContain('offline')
  expect(vm.loading).toBe(false)
})

it('does not let an earlier query overwrite a newer result', async() => {
  const vm = context()
  let finishFirst
  fetchSchedulingPlans.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    .mockResolvedValueOnce({ list: [{ planId: 2 }], total: 1 })
  const first = vm.load()
  await vm.search()
  finishFirst({ list: [{ planId: 1 }], total: 1 })
  await first
  expect(vm.plans).toEqual([{ planId: 2 }])
})

it('loads per-assignment results and refreshes the selected external plan', async() => {
  const vm = context()
  const detail = { plan: { planId: 42, status: 'PARTIAL_COMPLETED' }, assignments: [
    { assignmentId: 1, action: 'COPY_AND_USE', status: 'FAILED', errorMessage: 'copy failed' }
  ] }
  fetchSchedulingPlan.mockResolvedValue(detail)
  await vm.openDetail({ planId: 42 })
  expect(fetchSchedulingPlan).toHaveBeenCalledWith(42)
  expect(vm.detailVisible).toBe(true)
  expect(vm.detail).toEqual(detail)
  await vm.loadDetail()
  expect(fetchSchedulingPlan).toHaveBeenCalledTimes(2)
  expect(vm.detailLoading).toBe(false)
  expect(vm.statusLabel(detail.plan.status)).toBe('失败')
  expect(vm.statusType('FAILED')).toBe('danger')
  expect(vm.actionLabel('COPY_AND_USE')).toBe('复制后使用')
  expect(vm.formatTime('2026-09-02T20:15:30.123')).toBe('2026-09-02 20:15:30')
})

it('shows detail failures and discards responses after the dialog closes', async() => {
  const vm = context()
  fetchSchedulingPlan.mockRejectedValueOnce(new Error('not found'))
  await vm.openDetail({ planId: 99 })
  expect(vm.detailError).toContain('not found')
  expect(vm.detail).toBeNull()
  let finish
  fetchSchedulingPlan.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const request = vm.openDetail({ planId: 42 })
  vm.closeDetail()
  finish({ plan: { planId: 42 }, assignments: [] })
  await request
  expect(vm.detail).toBeNull()
  expect(vm.detailLoading).toBe(false)
})
