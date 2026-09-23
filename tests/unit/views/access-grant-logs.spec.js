import AccessGrantLogs from '@/views/ManagementCenter/AccessGrantLogs/index.vue'
import { fetchAccessGrantLog } from '@/api/accessControlApi'
import { parseTime } from '@/utils'

jest.mock('@/api/accessControlApi', () => ({ fetchAccessGrantLog: jest.fn() }))

const SERVER_NOW = Date.parse('2026-09-24T08:00:00.000Z')

function context() {
  const vm = { ...AccessGrantLogs.data() }
  Object.entries(AccessGrantLogs.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(AccessGrantLogs.computed).forEach(([name, get]) => {
    Object.defineProperty(vm, name, { get: () => get.call(vm) })
  })
  return vm
}

const rows = [
  {
    grantId: 102, userId: 7, username: 'owner-a', displayName: 'Owner A', domainName: 'Domain A',
    datasetId: 2, datasetName: 'covertype', datasetCode: 'real-covertype', datasetVersion: '1.0',
    reason: '联合建模', createdAt: '2026-09-24T07:30:00.000Z', expiresAt: '2026-09-24T08:30:00.000Z', active: true
  },
  {
    grantId: 101, userId: 9, username: 'auditor', displayName: 'auditor', domainName: null,
    datasetId: 3, datasetName: null, datasetCode: 'real-svhn', datasetVersion: null,
    reason: '审计抽查', createdAt: '2026-09-24T06:00:00.000Z', expiresAt: '2026-09-24T07:00:00.000Z', active: false
  }
]

beforeEach(() => {
  jest.resetAllMocks()
  jest.spyOn(Date, 'now').mockReturnValue(SERVER_NOW - 5 * 60000)
  fetchAccessGrantLog.mockResolvedValue({ serverTime: '2026-09-24T08:00:00.000Z', items: rows })
})

afterEach(() => jest.restoreAllMocks())

it('lists who applied for which dataset, why, when and whether the token is still usable', async() => {
  const vm = context()
  await vm.load()

  expect(fetchAccessGrantLog).toHaveBeenCalledWith(500)
  expect(vm.error).toBe('')
  expect(vm.pageRows.map(row => row.grantId)).toEqual([102, 101])
  const [active, expired] = vm.pageRows
  expect(vm.userLabel(active)).toBe('Owner A（owner-a）')
  expect(vm.userLabel(expired)).toBe('auditor')
  expect(vm.datasetLabel(active)).toBe('covertype（real-covertype · 1.0）')
  expect(vm.datasetLabel(expired)).toBe('real-svhn')
  expect(vm.formatTime(active.createdAt)).toBe(parseTime(new Date(Date.parse(active.createdAt))))
  expect(vm.isActive(active)).toBe(true)
  expect(vm.remainingText(active)).toBe('剩余 30 分钟')
  expect(vm.isActive(expired)).toBe(false)
})

it('judges token status by server time, not the browser clock, and flips it once the token expires', async() => {
  const vm = context()
  await vm.load()
  // The browser clock runs 5 minutes behind the server; the offset keeps the status exact.
  expect(vm.clockOffset).toBe(5 * 60000)
  expect(vm.isActive(rows[0])).toBe(true)

  vm.now = Date.parse('2026-09-24T08:30:00.000Z') - vm.clockOffset
  expect(vm.isActive(rows[0])).toBe(false)
})

it('filters by keyword and token status on the client', async() => {
  const vm = context()
  await vm.load()

  vm.filters.query = 'SVHN'
  expect(vm.filteredRows.map(row => row.grantId)).toEqual([101])
  vm.filters.query = ''
  vm.filters.status = 'ACTIVE'
  expect(vm.filteredRows.map(row => row.grantId)).toEqual([102])
  vm.filters.status = 'EXPIRED'
  expect(vm.filteredRows.map(row => row.grantId)).toEqual([101])
})

it('reports a failed load instead of showing an empty log', async() => {
  fetchAccessGrantLog.mockRejectedValue(new Error('required role: ADMIN'))
  const vm = context()
  await vm.load()
  expect(vm.error).toContain('required role: ADMIN')
  expect(vm.rows).toEqual([])
  expect(vm.loading).toBe(false)
})
