// task_management.schedule 是后端拼接的纯文本。这里把它拆成带标题的分组，
// 识别不了的历史文本原样返回（kind: 'raw'），页面据此直接展示原文。
const MODE_HEADERS = [
  { pattern: /^(?:分布式调度方案|IN_PLACE方案)\s*[:：]/i, title: '分布式调度方案' },
  // 后端文本写作“中心化”，页面统一显示为“集中式”。
  { pattern: /^(?:中心化调度方案|集中式调度方案|CENTRALIZED方案)\s*[:：]/i, title: '集中式调度方案' }
]
// 数据集管理页发起的计算调度：“调度目标节点 <nodeName>:”
const TARGET_HEADER = /^调度目标节点\s*([^:：]*?)\s*[:：]/

function scheduleHeader(line) {
  for (const { pattern, title } of MODE_HEADERS) {
    const match = line.match(pattern)
    if (match) return { kind: 'comparison', title, rest: line.slice(match[0].length).trim() }
  }
  const target = line.match(TARGET_HEADER)
  if (!target) return null
  return {
    kind: 'target',
    title: target[1] ? `调度目标节点 ${target[1]}` : '调度目标节点',
    rest: line.slice(target[0].length).trim()
  }
}

export function parseSchedule(value) {
  const text = value == null ? '' : String(value).trim()
  const raw = { kind: 'raw', sections: [], text }
  const sections = []
  let kind = null
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  for (const line of lines) {
    const header = scheduleHeader(line)
    if (header) {
      // 两种格式混在一起说明不是已知结构，按原文展示更稳妥。
      if (kind && kind !== header.kind) return raw
      kind = header.kind
      // 旧格式把第一条明细写在标题同一行，例如“分布式调度方案:A: x -> y”。
      sections.push({ title: header.title, lines: header.rest ? [header.rest] : [] })
    } else if (sections.length) {
      sections[sections.length - 1].lines.push(line)
    } else {
      return raw
    }
  }
  return sections.length ? { kind, sections, text } : raw
}

export function scheduleLineFailed(line) {
  return /[:：]\s*执行失败\s*$/.test(String(line || ''))
}

// datasetIdsJson 是 JSON 数组；selectedData 是后端 List.toString() 的结果，例如 “[iris, mnist]”。
function listValues(value) {
  if (Array.isArray(value)) return value
  const text = value == null ? '' : String(value).trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {
    // 非 JSON 的历史记录按分隔符拆分。
  }
  return text.replace(/^\[/, '').replace(/\]$/, '').split(/[,，、]/).map(item => item.trim()).filter(Boolean)
}

export function taskDatasetNames(row) {
  return listValues(row && row.selectedData).map(String)
}

export function taskDatasetCount(row) {
  const ids = listValues(row && row.datasetIdsJson)
  return ids.length || taskDatasetNames(row).length
}

export function taskScopeLabel(row) {
  const count = taskDatasetCount(row)
  if (!count) return '—'
  return count > 1 ? '多数据集任务' : '单数据集任务'
}

export function executionModeLabel(mode) {
  const labels = { COMPARISON: '分布式 + 集中式', CENTRALIZED: '集中式', IN_PLACE: '分布式' }
  const key = mode == null ? '' : String(mode).trim().toUpperCase()
  return labels[key] || (key ? String(mode) : '—')
}
