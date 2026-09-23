import fs from 'fs'
import path from 'path'
import SecurityValidation from '@/views/ManagementCenter/SecurityValidation/index.vue'
import { fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { fetchDatasetAccessAuditEvents } from '@/api/securityValidationApi'
import { parseTime } from '@/utils'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(),
  fetchRegisteredNodes: jest.fn(),
  verifyDataset: jest.fn()
}))
jest.mock('@/api/securityValidationApi', () => ({
  authorizeDatasetAccess: jest.fn(),
  fetchDatasetAccessAuditEvents: jest.fn(),
  startSecureAggregation: jest.fn(),
  fetchSecureAggregationRun: jest.fn(),
  fetchSecureAggregationEvents: jest.fn()
}))

function context() {
  const vm = { ...SecurityValidation.data() }
  Object.entries(SecurityValidation.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(SecurityValidation.computed).forEach(([name, get]) => {
    Object.defineProperty(vm, name, { get: () => get.call(vm) })
  })
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('derives the scoped access path and Kubernetes node from a usable replica', () => {
  const vm = context()
  vm.datasets = [{
    datasetId: 9,
    replicas: [
      { nodeId: 1, filePath: '/dataset/bad.bin', effectiveAvailability: 'MISSING', availability: 'AVAILABLE' },
      { nodeId: 2, filePath: '/dataset/good.bin', effectiveAvailability: 'USABLE', availability: 'AVAILABLE' }
    ]
  }]
  vm.nodes = [{ nodeId: 2, k8sNodeName: 'master-89' }]
  vm.access.datasetId = 9

  vm.syncAccessDefaults()

  expect(vm.access.path).toBe('/dataset/good.bin')
  expect(vm.access.targetNode).toBe('master-89')
})

it('hides the integrity, token-test and MP-SPDZ tabs and loads only what the abnormal log needs', async() => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/views/ManagementCenter/SecurityValidation/index.vue'), 'utf8')
  expect(source).toContain('const SHOW_ACCEPTANCE_TOOLS = false')
  for (const name of ['integrity', 'access', 'aggregation']) {
    expect(source).toMatch(new RegExp(`<el-tab-pane v-if="showAcceptanceTools" label="[^"]+" name="${name}">`))
  }
  expect(source).toContain('<el-tab-pane label="异常访问记录" name="abnormal">')

  const vm = context()
  expect(vm.showAcceptanceTools).toBe(false)
  vm.loadAccessEvents = jest.fn()
  fetchDatasetAccessAuditEvents.mockResolvedValue([])
  fetchRegisteredDatasets.mockResolvedValue({ list: [{ datasetId: 9, name: 'covertype' }], total: 1 })

  await SecurityValidation.created.call(vm)

  expect(fetchDatasetAccessAuditEvents).toHaveBeenCalledWith({ decision: 'DENIED', limit: 100 })
  expect(vm.datasets.map(item => item.datasetId)).toEqual([9])
  expect(fetchRegisteredNodes).not.toHaveBeenCalled()
  expect(vm.loadAccessEvents).not.toHaveBeenCalled()
  expect(vm.access.datasetId).toBeNull()
})

it('opens on the abnormal access tab and lists only denied access events', async() => {
  const vm = context()
  expect(vm.activeTab).toBe('abnormal')
  fetchDatasetAccessAuditEvents.mockResolvedValue([
    { eventId: 2, principal: 'alice', datasetId: '9', action: 'TASK_CREATE', decision: 'DENIED', reason: 'CROSS_DOMAIN_ACCESS_DENIED', requestId: 'req-2', createdAt: '2026-09-24T03:04:05.123' },
    { eventId: 1, principal: 'bob', datasetId: '9', action: 'READ', decision: 'ALLOWED', reason: 'OK', requestId: 'req-1' }
  ])

  await vm.loadAbnormalEvents()

  expect(fetchDatasetAccessAuditEvents).toHaveBeenCalledWith({ decision: 'DENIED', limit: 100 })
  expect(vm.abnormal.events.map(event => event.eventId)).toEqual([2])
  expect(vm.abnormal.error).toBe('')
  expect(vm.abnormal.loading).toBe(false)
})

it('keeps a failed abnormal access query separate from an empty log', async() => {
  const vm = context()
  fetchDatasetAccessAuditEvents.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'))
  await vm.loadAbnormalEvents()
  expect(vm.abnormal.events).toEqual([])
  expect(vm.abnormal.error).toBe('')
  await vm.loadAbnormalEvents()
  expect(vm.abnormal.error).toContain('offline')
  expect(vm.abnormal.loading).toBe(false)
})

it('labels denied cross-domain task creation and names the dataset when it is known', () => {
  const vm = context()
  vm.datasets = [{ datasetId: 9, name: 'covertype' }]
  expect(vm.actionLabel('TASK_CREATE')).toBe('创建任务')
  expect(vm.actionLabel('READ')).toBe('READ')
  expect(vm.reasonLabel('CROSS_DOMAIN_ACCESS_DENIED')).toBe('跨域访问权限外数据集')
  expect(vm.reasonLabel('TOKEN_EXPIRED')).toBe('TOKEN_EXPIRED')
  expect(vm.datasetLabel('9')).toBe('covertype #9')
  expect(vm.datasetLabel('404')).toBe('404')
  expect(vm.datasetLabel(null)).toBe('—')
})

it('reads zone-less audit timestamps as UTC in every tab', () => {
  const vm = context()
  const expected = parseTime(new Date(Date.UTC(2026, 8, 24, 3, 4, 5)))
  expect(vm.formatEventTime('2026-09-24T03:04:05')).toBe(expected)
  expect(vm.formatEventTime('2026-09-24T03:04:05.123')).toBe(expected)
  expect(vm.formatEventTime('2026-09-24 03:04:05')).toBe(expected)
  expect(vm.formatEventTime('2026-09-24T03:04:05Z')).toBe(expected)
  expect(vm.formatEventTime('2026-09-24T11:04:05+08:00')).toBe(expected)
  expect(vm.formatEventTime([2026, 9, 24, 3, 4, 5, 123000000])).toBe(expected)
  expect(vm.formatEventTime(null)).toBe('—')
  expect(vm.formatEventTime('not a time')).toBe('not a time')
})
