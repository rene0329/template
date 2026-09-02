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

  it('optionally excludes missing replicas before calculating node rows and counts', () => {
    const dataset = { datasetId: 1, name: 'mixed', replicas: [
      { nodeId: 7, availability: 'AVAILABLE', effectiveAvailability: 'USABLE', filePath: '/present', sizeBytes: 100 },
      { nodeId: 7, availability: 'MISSING', filePath: '/missing', sizeBytes: 999 },
      { nodeId: 7, effectiveAvailability: 'MISSING', filePath: '/effective-missing', sizeBytes: 999 },
      { nodeId: 8, availability: 'AVAILABLE', filePath: '/other-node', sizeBytes: 999 }
    ] }
    const rows = datasetsForNode([dataset], '7', { excludeMissing: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ replicaCount: 1, filePath: '/present', dataSize: 100, replicaStatus: 'USABLE' })
    expect(rows[0].replicas).toHaveLength(1)
    // Other management views still retain historical records by default.
    expect(datasetsForNode([dataset], 7)[0].replicaCount).toBe(3)
    expect(dataset.replicas).toHaveLength(4)
  })

  it('omits a dataset on a missing-only node without hiding its live replica elsewhere', () => {
    const datasets = [{ datasetId: 1, replicas: [
      { nodeId: 7, availability: 'MISSING' },
      { nodeId: 8, availability: 'AVAILABLE', effectiveAvailability: 'USABLE' }
    ] }]
    expect(datasetsForNode(datasets, 7, { excludeMissing: true })).toEqual([])
    expect(datasetsForNode(datasets, 8, { excludeMissing: true })).toHaveLength(1)
  })

  it('keeps non-missing statuses visible rather than hiding offline or unverified files', () => {
    const datasets = [{ datasetId: 1, replicas: [
      { nodeId: 7, availability: 'AVAILABLE', effectiveAvailability: 'NODE_OFFLINE' },
      { nodeId: 7, availability: 'UNKNOWN' }
    ] }]
    expect(datasetsForNode(datasets, 7, { excludeMissing: true })[0].replicaCount).toBe(2)
  })
})
