import SelectData from '@/views/ManagementCenter/SelectData/index.vue'
import FrameNet from '@/views/ManagementCenter/FrameNet/index.vue'
import { fetchRegisteredDatasets, fetchRegisteredNodes, createRegisteredTask, preflightRegisteredTask } from '@/api/registrationApi'
import { fetchNetworkTopology } from '@/api/managementCenterApi'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(), fetchRegisteredNodes: jest.fn(), createRegisteredTask: jest.fn(),
  preflightRegisteredTask: jest.fn(), requestId: () => 'stable-request-key'
}))
jest.mock('@/api/managementCenterApi', () => ({ fetchNetworkTopology: jest.fn() }))

function context(component) {
  const vm = { ...component.data(), $message: { error: jest.fn(), success: jest.fn() },
    $refs: { datasetTable: { clearSelection: jest.fn() }}, $alert: jest.fn().mockResolvedValue(),
    $nextTick: jest.fn() }
  Object.entries(component.methods).forEach(([key, method]) => { vm[key] = method.bind(vm) })
  Object.entries(component.computed || {}).forEach(([key, get]) => Object.defineProperty(vm, key, { get: () => get.call(vm) }))
  return vm
}

beforeEach(() => jest.clearAllMocks())

it('a user search supersedes an in-flight poll', async() => {
  const vm = context(SelectData)
  let finishPoll
  fetchRegisteredDatasets.mockImplementationOnce(() => new Promise(resolve => { finishPoll = resolve }))
    .mockResolvedValueOnce({ list: [{ datasetId: 2, name: 'new' }], total: 1 })
  const poll = vm.fetchData(true)
  vm.formInline.name = 'new'
  await vm.fetchData(false)
  finishPoll({ list: [{ datasetId: 1, name: 'old' }], total: 1 })
  await poll
  expect(vm.TaskData[0].datasetId).toBe(2)
  expect(vm.selectedRows).toEqual([])
})

it('failed submission retry reuses the key and real dataset IDs', async() => {
  const vm = context(SelectData)
  vm.selectedRows = [{ datasetId: 5001, dataId: 1 }]
  preflightRegisteredTask.mockResolvedValue({ valid: true, checks: [] })
  createRegisteredTask.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ taskId: 42 })
  await vm.handleSubmit()
  await vm.handleSubmit()
  expect(createRegisteredTask.mock.calls[0]).toEqual(createRegisteredTask.mock.calls[1])
  expect(createRegisteredTask.mock.calls[0][0].datasetIds).toEqual([5001])
  expect(vm.lastTaskId).toBe(42)
})

it('rejects unavailable selections and prevents duplicate clicks', async() => {
  const vm = context(SelectData)
  vm.selectedRows = [{ datasetId: 5001 }]
  preflightRegisteredTask.mockResolvedValue({ valid: false, checks: [{ available: false, name: 'd', message: 'disabled' }] })
  const pending = vm.handleSubmit()
  await vm.handleSubmit()
  await pending
  expect(preflightRegisteredTask).toHaveBeenCalledTimes(1)
  expect(createRegisteredTask).not.toHaveBeenCalled()
  expect(vm.$alert).toHaveBeenCalledWith('d: disabled', expect.any(String), expect.any(Object))
})

it('retains selection during polling', async() => {
  const vm = context(SelectData)
  vm.selectedRows = [{ datasetId: 5 }]
  fetchRegisteredDatasets.mockResolvedValue({ list: [{ datasetId: 5, name: 'd' }], total: 1 })
  await vm.fetchData(true)
  expect(vm.selectedRows).toEqual([{ datasetId: 5 }])
})

it('a failed catalog load does not suppress topology updates', async() => {
  const vm = context(FrameNet)
  fetchRegisteredDatasets.mockRejectedValue(new Error('catalog offline'))
  fetchNetworkTopology.mockResolvedValue({ nodes: [{ id: 'n', nodeId: 8 }], edges: [] })
  await Promise.all([vm.refreshDatasets(), vm.fetchData(false, true)])
  expect(vm.nodes[0].nodeId).toBe(8)
  expect(vm.datasetError).toContain('catalog offline')
})

it('preserves topology zoom, pan and selection when polling only changes metrics or ordering', async() => {
  const vm = context(FrameNet)
  vm.svgWidth = 1000
  vm.svgHeight = 300
  const nodes = [{ id: 'a', cpu: 10 }, { id: 'b', cpu: 20 }]
  const edges = [{ source: 'a', target: 'b', active: false }]
  fetchNetworkTopology.mockResolvedValueOnce({ nodes, edges })
    .mockResolvedValueOnce({ nodes: [...nodes].reverse().map(node => ({ ...node, cpu: 50 })), edges })
  await vm.fetchData()
  vm.$nextTick.mockClear()
  vm.pan = { x: 45, y: 60 }
  vm.scale = 1.5
  vm.selectedNodeId = 'b'
  await vm.fetchData(false, true)
  expect(vm.pan).toEqual({ x: 45, y: 60 })
  expect(vm.scale).toBe(1.5)
  expect(vm.selectedNodeId).toBe('b')
  expect(vm.$nextTick).not.toHaveBeenCalled()
})

it('zooms around the pointer and pans the topology when dragging the canvas', () => {
  const vm = context(FrameNet)
  vm.$refs.svg = { getBoundingClientRect: () => ({ left: 10, top: 20 }) }
  vm.$el = { style: {}}
  vm.handleWheel({ preventDefault: jest.fn(), deltaY: -1, clientX: 110, clientY: 120 })
  expect(vm.scale).toBeCloseTo(1.1)
  expect(vm.pan.x).toBeCloseTo(-10)
  expect(vm.pan.y).toBeCloseTo(-10)
  vm.startDrag({ button: 0, clientX: 110, clientY: 120 })
  vm.handleMouseMove({ clientX: 140, clientY: 150 })
  expect(vm.pan.x).toBeCloseTo(20)
  expect(vm.pan.y).toBeCloseTo(20)
  vm.stopDrag()
  expect(vm.isDragging).toBe(false)
})

it('joins registered internal IP without replacing the live public IP location or topology state', async() => {
  const vm = context(FrameNet)
  vm.topologyNodes = [{ id: 'display-name', nodeId: 4, effectiveStatus: 'AVAILABLE', externalIp: '121.43.57.204',
    publicIpLocation: { ip: '121.43.57.204', status: 'RESOLVED', displayName: '中国 · 浙江省 · 杭州市' }
  }]
  fetchRegisteredNodes.mockResolvedValue({ list: [
    { nodeId: 3, internalIp: '10.212.14.88' },
    { nodeId: 4, internalIp: '10.213.0.1', clusterId: 'in-cluster-default', effectiveStatus: 'OFFLINE' }
  ], total: 2 })
  await vm.refreshNodeDetails()
  expect(vm.nodes[0].internalIp).toBe('10.213.0.1')
  expect(vm.nodes[0].location).toBe('中国 · 浙江省 · 杭州市')
  expect(vm.nodes[0].effectiveStatus).toBe('AVAILABLE')
})

it('retains IP metadata when a background registration request fails', async() => {
  const vm = context(FrameNet)
  vm.registeredNodes = [{ nodeId: 4, internalIp: '10.213.0.1' }]
  fetchRegisteredNodes.mockRejectedValueOnce(new Error('offline'))
  await vm.refreshNodeDetails()
  expect(vm.registeredNodes[0].internalIp).toBe('10.213.0.1')
  expect(vm.nodeDetailsError).toContain('加载失败')
  expect(vm.nodeDetailsLoading).toBe(false)
})

it('shows IP and corresponding location in escaped tooltip text', () => {
  const vm = context(FrameNet)
  vm.showTip('node', { label: 'alihz', internalIp: '10.213.0.1', location: '杭州 <机房>', datasets: [] }, { clientX: 100, clientY: 100 })
  expect(vm.tip.html).toContain('<b>内网 IP：</b>10.213.0.1')
  expect(vm.tip.html).toContain('<b>公网 IP：</b>未获取')
  expect(vm.tip.html).toContain('<b>IP 归属地：</b>杭州 &lt;机房&gt;')
  expect(vm.tip.html).not.toContain('<机房>')
  vm.showTip('node', { label: 'unknown', datasets: [] }, { clientX: 100, clientY: 100 })
  expect(vm.tip.html).toContain('<b>内网 IP：</b>未登记')
  expect(vm.tip.html).toContain('<b>公网 IP：</b>未获取')
  expect(vm.tip.html).toContain('未查到归属地')
})

it('always shows separate internal and public IP rows without substituting one for the other', () => {
  const vm = context(FrameNet)
  const event = { clientX: 100, clientY: 100 }
  vm.showTip('node', { label: 'dual-ip', internalIp: '10.213.0.1', externalIp: '203.0.113.10', datasets: [] }, event)
  expect(vm.tip.html).toContain('<b>内网 IP：</b>10.213.0.1')
  expect(vm.tip.html).toContain('<b>公网 IP：</b>203.0.113.10')
  vm.showTip('node', { label: 'public-only', externalIp: '203.0.113.10', datasets: [] }, event)
  expect(vm.tip.html).toContain('<b>内网 IP：</b>未登记')
  expect(vm.tip.html).toContain('<b>公网 IP：</b>203.0.113.10')
})

it('prefers the latest topology public IP to the slower registration metadata poll', () => {
  const vm = context(FrameNet)
  vm.topologyNodes = [{ id: 'node-a', nodeId: 4, externalIp: '203.0.113.20' }]
  vm.registeredNodes = [{ nodeId: 4, externalIp: '203.0.113.10' }]
  expect(vm.nodes[0].externalIp).toBe('203.0.113.20')
})
