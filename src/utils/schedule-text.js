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

// 数据集管理页计算调度的动作，旧记录里是英文枚举。
const ACTION_LABELS = { COPY_AND_USE: '复制', MOVE_AND_USE: '迁移', USE_IN_PLACE: '原位', REMOTE_READ: '远程读取' }

// 数据集管理页发起的计算调度只有一次调度，不区分集中式/分布式，按目标节点分组。
// 旧记录的文本仍是“分布式调度方案:<code>: <src> -> <dst> [COPY_AND_USE]\n中心化调度方案:”，
// 这里去掉模式标题，按每行的目标节点重新归组。
function parseManualSchedule(text) {
  const groups = new Map()
  let target = null
  const add = (node, line) => {
    if (!groups.has(node)) groups.set(node, [])
    if (line) groups.get(node).push(line)
  }
  for (const line of text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
    const header = scheduleHeader(line)
    if (header && header.kind === 'target') {
      target = header.title.replace(/^调度目标节点\s*/, '')
      add(target, header.rest)
      continue
    }
    const detail = header ? header.rest : line
    if (header) target = null
    if (!detail) continue
    const label = detail.replace(/\[([A-Z_]+)\]\s*$/, (match, action) => `[${ACTION_LABELS[action] || action}]`)
    const destination = detail.match(/->\s*(\S+)/)
    add(target != null ? target : (destination ? destination[1] : ''), label)
  }
  const sections = Array.from(groups, ([node, lines]) => ({ title: node ? `调度目标节点 ${node}` : '调度目标节点', lines }))
  return { kind: 'target', sections: sections.length ? sections : [{ title: '调度目标节点', lines: [] }], text }
}

export function parseSchedule(value, options = {}) {
  const text = value == null ? '' : String(value).trim()
  if (options.manual) return parseManualSchedule(text)
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

