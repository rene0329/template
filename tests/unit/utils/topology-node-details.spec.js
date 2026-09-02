import { nodeLocation, summarizeNodeDatasets } from '@/utils/topology-node-details'

it('uses the lookup result associated with the displayed public IP', () => {
  expect(nodeLocation({
    externalIp: '47.116.9.113',
    publicIpLocation: { ip: '47.116.9.113', status: 'RESOLVED', displayName: '中国 · 上海市' }
  })).toBe('中国 · 上海市')
})

it('never infers IP geography from names, private IPs or deployment labels', () => {
  expect(nodeLocation({ label: 'alish', cluster: 'in-cluster-default', internalIp: '10.213.0.5',
    labels: { location: '上海机房', country: '中国', city: '上海', 'topology.kubernetes.io/region': 'cn-shanghai' }
  })).toBe('未获取公网 IP')
  expect(nodeLocation({})).toBe('未获取公网 IP')
  expect(nodeLocation({ externalIp: '47.116.9.113', labels: { location: '上海机房' }})).toBe('未查到归属地')
})

it('does not reuse a location after the public IP changes', () => {
  expect(nodeLocation({ externalIp: '121.43.57.204',
    publicIpLocation: { ip: '47.116.9.113', status: 'RESOLVED', displayName: '中国 · 上海市' }
  })).toBe('未查到归属地')
})

it('distinguishes unavailable lookup, invalid IP and absent records', () => {
  const node = status => ({ externalIp: '47.116.9.113', publicIpLocation: { ip: '47.116.9.113', status }})
  expect(nodeLocation(node('UNAVAILABLE'))).toBe('归属地查询暂不可用')
  expect(nodeLocation(node('INVALID_IP'))).toBe('无有效公网 IP')
  expect(nodeLocation(node('NOT_FOUND'))).toBe('未查到归属地')
  expect(nodeLocation(node('RESOLVED'))).toBe('未查到归属地')
})

it('previews dataset names followed by the total count', () => {
  expect(summarizeNodeDatasets([{ dataName: 'yelp' }])).toBe('yelp（1个）')
  expect(summarizeNodeDatasets([{ dataName: 'nlpcc2013' }, { dataName: 'ciao' }])).toBe('nlpcc2013、ciao（2个）')
  expect(summarizeNodeDatasets([{ name: 'yelp' }, { name: 'epinions' }, { name: 'catdog' }])).toBe('yelp、epinions…（3个）')
})

it('limits long previews without losing the count or splitting Unicode characters', () => {
  expect(summarizeNodeDatasets([{ name: 'abcdefghijklmnopqrstuvwxyz123' }]))
    .toBe('abcdefghijklmnopqrstuvwxyz…（1个）')
  expect(summarizeNodeDatasets([{ name: '数据'.repeat(20) }])).toBe('数据'.repeat(6) + '数…（1个）')
  expect(summarizeNodeDatasets([{ name: '📊'.repeat(20) }])).toBe('📊'.repeat(13) + '…（1个）')
  expect(summarizeNodeDatasets([])).toBe('暂无数据集（0个）')
})
