import { fetchAllPages, datasetRow, datasetsForNode, formatBytes } from '@/utils/dataset-catalog'

describe('registered dataset contract', () => {
  it('reads every page without exceeding 100', async() => {
    const source = Array.from({ length: 205 }, (_, datasetId) => ({ datasetId }))
    const fetchPage = jest.fn(({ page, pageSize }) => Promise.resolve({
      list: source.slice((page - 1) * pageSize, page * pageSize), total: source.length
    }))
    expect(await fetchAllPages(fetchPage)).toEqual(source)
    expect(fetchPage.mock.calls.map(call => call[0])).toEqual([
      { page: 1, pageSize: 100 }, { page: 2, pageSize: 100 }, { page: 3, pageSize: 100 }
    ])
  })

  it('reports a partial failure instead of returning a truncated catalog', async() => {
    const fetchPage = jest.fn().mockResolvedValueOnce({ list: Array(100).fill({}), total: 101 })
      .mockRejectedValueOnce(new Error('offline'))
    await expect(fetchAllPages(fetchPage)).rejects.toThrow('offline')
  })

  it('associates all replicas by node ID and keeps logical IDs distinct', () => {
    const dataset = { datasetId: 1001, dataId: 1, name: 'test', replicas: [
      { nodeId: 7, sizeBytes: 1024, filePath: '/a' },
      { nodeId: 7, sizeBytes: 1024, filePath: '/b' },
      { nodeId: 8, sizeBytes: 1024, filePath: '/c' }
    ] }
    const rows = datasetsForNode([dataset], '7')
    expect(rows).toHaveLength(1)
    expect(rows[0].replicaCount).toBe(2)
    expect(rows[0].datasetId).toBe(1001)
    expect(rows[0].filePath).toBe('/a；/b')
    expect(datasetsForNode([dataset], 8)).toHaveLength(1)
    expect(datasetsForNode([dataset], 9)).toHaveLength(0)
  })

  it('does not turn missing sizes into zero', () => {
    expect(formatBytes(null)).toBe('暂无数据')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.00 KiB')
    expect(datasetRow({ datasetId: 1 }).dataSize).toBe(null)
  })
})
