import { nodeLocation, summarizeNodeDatasets } from '@/utils/topology-node-details'

it('maps the documented tunnel IPs to their deployed cities', () => {
  expect(nodeLocation({ cluster: 'in-cluster-default', internalIp: '10.213.0.1' })).toBe('中国 · 浙江 · 杭州')
  expect(nodeLocation({ clusterId: 'in-cluster-default', internalIp: '10.213.0.3' })).toBe('中国 · 北京')
  expect(nodeLocation({ clusterId: 'in-cluster-default', internalIp: '10.213.0.5' })).toBe('中国 · 上海')
})

it('does not infer geography from node names, private subnets or unrelated clusters', () => {
  expect(nodeLocation({ label: 'alihz', internalIp: '10.213.0.99' })).toBe('位置未配置')
  expect(nodeLocation({ cluster: 'another-cluster', internalIp: '10.213.0.1' })).toBe('位置未配置')
  expect(nodeLocation({ cluster: 'in-cluster-default', internalIp: '10.212.14.88' })).toBe('位置未配置')
  expect(nodeLocation({})).toBe('位置未配置')
})

it('prefers registered location metadata to deployment defaults', () => {
  expect(nodeLocation({ cluster: 'in-cluster-default', internalIp: '10.213.0.1', labels: { location: '测试机房' }}))
    .toBe('测试机房')
  expect(nodeLocation({ labels: { country: '中国', province: '浙江', city: '杭州' }}))
    .toBe('中国 · 浙江 · 杭州')
  expect(nodeLocation({ labels: { province: '北京', city: '北京' }})).toBe('北京')
})

it('supports registered Kubernetes region and zone labels', () => {
  expect(nodeLocation({ labels: { 'topology.kubernetes.io/region': 'cn-hangzhou', 'topology.kubernetes.io/zone': 'cn-hangzhou-a' }}))
    .toBe('cn-hangzhou · cn-hangzhou-a')
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
