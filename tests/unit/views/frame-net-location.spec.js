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
