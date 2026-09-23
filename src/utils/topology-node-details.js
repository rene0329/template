export function nodeLocation(node) {
  const ip = typeof node.externalIp === 'string' ? node.externalIp.trim() : ''
  if (!ip) return '未获取公网 IP'
  const location = node.publicIpLocation
  // Do not reuse a result belonging to a previous egress IP or registry poll.
  if (!location || location.ip !== ip) return '未查到归属地'
  if (location.status === 'UNAVAILABLE') return '归属地查询暂不可用'
  if (location.status === 'INVALID_IP') return '无有效公网 IP'
  return location.status === 'RESOLVED' && location.displayName
    ? location.displayName : '未查到归属地'
}

const DOMAIN_LABELS = {
  center: '中心域',
  hangzhou: '杭州',
  shanghai: '上海',
  beijing: '北京',
  shenzhen: '深圳'
}

export function domainLabel(site) {
  const key = String(site || '').trim().toLowerCase()
  if (!key) return '未分域'
  return DOMAIN_LABELS[key] || key
}

const DOMAIN_PALETTE = ['#5b8def', '#e08e45', '#8a6fd8', '#3fae8f', '#d1618a', '#4aa3c4']

// Deterministic so the same site always draws the same box color across refreshes.
export function domainColor(site) {
  const key = String(site || '').trim().toLowerCase()
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)) >>> 0
  return DOMAIN_PALETTE[hash % DOMAIN_PALETTE.length]
}

const NODE_TYPES = new Set(['compute', 'storage', 'compute-storage'])

// Node type drives which icon is drawn; anything unrecognised falls back to the plain disc.
export function normalizeNodeType(type) {
  const key = String(type || '').trim().toLowerCase()
  return NODE_TYPES.has(key) ? key : null
}

const NODE_TYPE_LABELS = {
  compute: '计算节点',
  storage: '存储节点',
  'compute-storage': '计算+存储节点'
}

export function nodeTypeLabel(type) {
  return NODE_TYPE_LABELS[normalizeNodeType(type)] || '未知类型'
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
