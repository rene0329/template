// Confirmed tunnel endpoint locations from docs/cluster-memory.md (2026-09-02).
// Scope private addresses to this deployment; they are not public IP geolocation.
const deploymentLocations = {
  'in-cluster-default': {
    '10.213.0.1': '中国 · 浙江 · 杭州',
    '10.213.0.3': '中国 · 北京',
    '10.213.0.5': '中国 · 上海'
  }
}

export function nodeLocation(node) {
  const labels = node.labels || {}
  const explicit = [labels.location, labels.country, labels.province, labels.city]
    .map(value => typeof value === 'string' ? value.trim() : '')
  if (explicit[0]) return explicit[0]
  const geography = explicit.slice(1).filter(Boolean)
  if (geography.length) return [...new Set(geography)].join(' · ')
  const region = labels['topology.kubernetes.io/region'] || labels['failure-domain.beta.kubernetes.io/region']
  const zone = labels['topology.kubernetes.io/zone'] || labels['failure-domain.beta.kubernetes.io/zone']
  if (region || zone) return [region, zone].filter(Boolean).join(' · ')
  const configured = deploymentLocations[node.clusterId || node.cluster]
  return (configured && configured[node.internalIp]) || '位置未配置'
}

export function summarizeNodeDatasets(datasets = []) {
  if (!datasets.length) return '暂无数据集（0个）'
  const names = datasets.slice(0, 2).map(dataset => String(dataset.dataName || dataset.name || '未命名数据集').trim()).join('、')
  let preview = ''
  let width = 0
  // Keep the preview within the node label, reserving space for the full count.
  for (const character of names) {
    width += character.codePointAt(0) > 255 ? 2 : 1
    if (width > 26) break
    preview += character
  }
  const truncated = datasets.length > 2 || preview !== names
  return `${preview}${truncated ? '…' : ''}（${datasets.length}个）`
}
