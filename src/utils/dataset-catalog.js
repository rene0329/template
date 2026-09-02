// Registered dataset IDs are logical IDs. Never substitute a legacy dataId.
export async function fetchAllPages(fetchPage, options = {}) {
  const items = []
  let page = 1
  let total = Infinity
  while (items.length < total) {
    const result = await fetchPage({ page, pageSize: 100 }, options)
    if (!Array.isArray(result.list) || !Number.isFinite(result.total)) throw new Error('数据集分页响应无效')
    total = result.total
    if (!result.list.length && items.length < total) throw new Error('数据集列表发生变化，请刷新重试')
    items.push(...result.list)
    page++
  }
  return items
}

export function datasetRow(dataset, replicas = dataset.replicas || []) {
  const sizes = replicas.map(r => r.sizeBytes).filter(size => size != null)
  return {
    ...dataset,
    dataName: dataset.name,
    fileType: dataset.format || dataset.dataType,
    dataDescription: dataset.description,
    dataSize: sizes.length ? Math.max(...sizes) : null,
    filePath: replicas.map(r => r.filePath).filter(Boolean).join('；'),
    replicaCount: replicas.length,
    replicaStatus: replicas.map(r => r.effectiveAvailability || r.availability || 'UNKNOWN').join(' / '),
    updatedAt: replicas.map(r => r.updatedAt || r.lastSeenAt).filter(Boolean).sort().pop() || null,
    replicas
  }
}

export function datasetsForNode(datasets, nodeId, { excludeMissing = false } = {}) {
  return datasets.reduce((rows, dataset) => {
    // Filter replicas before deriving names, paths, sizes and counts for the node.
    const replicas = (dataset.replicas || []).filter(r => String(r.nodeId) === String(nodeId) &&
      (!excludeMissing || (r.availability !== 'MISSING' && r.effectiveAvailability !== 'MISSING')))
    if (replicas.length) rows.push(datasetRow(dataset, replicas))
    return rows
  }, [])
}

export function formatBytes(value) {
  if (value == null || value === '') return '暂无数据'
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return '暂无数据'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const index = Math.min(Math.max(Math.floor(Math.log(bytes) / Math.log(1024)), 0), units.length - 1)
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

export function formatHeat(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '暂无数据'
  return Number(value).toFixed(2)
}
