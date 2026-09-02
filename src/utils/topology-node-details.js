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
