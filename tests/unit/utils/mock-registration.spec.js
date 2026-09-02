const routes = require('../../../mock/management')
const route = (url, type = 'get') => routes.find(r => r.url === url && r.type === type)

it('demo uses the same strict page limit and replica availability vocabulary', () => {
  const datasets = route('/api/v1/datasets$')
  expect(() => datasets.response({ query: { pageSize: 101 } })).toThrow('1 and 100')
  const page = datasets.response({ query: { pageSize: 100 } }).data
  expect(page.list.length).toBeGreaterThan(0)
  expect(page.list.every(d => d.datasetId >= 1000)).toBe(true)
  for (const dataset of page.list) {
    expect(dataset.availableReplicaCount).toBe(dataset.replicas.filter(r => r.effectiveAvailability === 'USABLE').length)
    expect(dataset.replicas.every(r => ['USABLE', 'UNREACHABLE'].includes(r.effectiveAvailability))).toBe(true)
  }
})

it('demo enforces edit restrictions and real task idempotency', () => {
  const edit = route('/common/updateDataItem', 'post')
  expect(() => edit.response({ body: { dataId: 1, dataHeat: 8, dataSize: 10 } })).toThrow('only dataId')
  const datasets = route('/api/v1/datasets$').response({ query: { pageSize: 100 } }).data.list
  const dataset = datasets.find(d => d.status === 'ACTIVE' && d.availableReplicaCount > 0)
  const create = route('/api/v1/tasks$', 'post')
  const req = { headers: { 'idempotency-key': 'test-idempotency-key' }, body: { datasetIds: [dataset.datasetId], taskName: 'test' } }
  const first = create.response(req)
  expect(create.response(req)).toEqual(first)
  expect(first.data.taskId).toBeGreaterThan(0)
  expect(() => create.response({ ...req, body: { ...req.body, taskName: 'changed' } })).toThrow('different payload')
})
