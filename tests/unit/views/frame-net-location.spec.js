import FrameNet from '@/views/ManagementCenter/FrameNet/index.vue'

jest.mock('@/api/managementCenterApi', () => ({ fetchNetworkTopology: jest.fn() }))
jest.mock('@/api/registrationApi', () => ({ fetchRegisteredDatasets: jest.fn(), fetchRegisteredNodes: jest.fn() }))

it('keeps the topology public IP and its lookup together when the registry poll is older', () => {
  const nodes = FrameNet.computed.nodes.call({
    topologyNodes: [{ nodeId: 5, externalIp: '47.116.9.113', publicIpLocation: {
      ip: '47.116.9.113', status: 'RESOLVED', displayName: '中国 · 上海市'
    }}],
    registeredNodes: [{ nodeId: 5, externalIp: '121.43.57.204', labels: { location: '杭州机房' }}],
    datasets: []
  })
  expect(nodes[0].externalIp).toBe('47.116.9.113')
  expect(nodes[0].location).toBe('中国 · 上海市')
})

it('does not display an earlier lookup if the topology IP changes', () => {
  const nodes = FrameNet.computed.nodes.call({
    topologyNodes: [{ nodeId: 5, externalIp: '121.43.57.204', publicIpLocation: {
      ip: '47.116.9.113', status: 'RESOLVED', displayName: '中国 · 上海市'
    }}],
    registeredNodes: [], datasets: []
  })
  expect(nodes[0].location).toBe('未查到归属地')
})

it('keeps unmeasured link metrics empty instead of showing zero', () => {
  const edges = FrameNet.methods.normalizeEdges.call(FrameNet.methods, [
    { source: 'master-40', target: 'cluster-sz-1', latency: null, bandwidth: null, status: 'UNKNOWN' },
    { source: 'master-40', target: 'master-141', latency: 0.067, bandwidth: 42, status: 'active' }
  ])
  expect(edges[0].latency).toBeNull()
  expect(edges[0].bandwidth).toBeNull()
  expect(edges[1].latency).toBe(0.067)
  expect(edges[1].bandwidth).toBe(42)
})
