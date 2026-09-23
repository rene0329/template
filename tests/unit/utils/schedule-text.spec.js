import {
  parseSchedule, scheduleLineFailed, taskDatasetNames, taskDatasetCount, taskScopeLabel, executionModeLabel
} from '@/utils/schedule-text'

describe('parseSchedule', () => {
  it('splits a comparison task into distributed and centralized blocks with one line per dataset', () => {
    const text = [
      '分布式调度方案:',
      'ds-a: node-1 -> node-1',
      'ds-b: node-2 -> node-2',
      '中心化调度方案:',
      'ds-a: node-1 -> central',
      'ds-b: 执行失败'
    ].join('\n')
    expect(parseSchedule(text)).toEqual({
      kind: 'comparison',
      text,
      sections: [
        { title: '分布式调度方案', lines: ['ds-a: node-1 -> node-1', 'ds-b: node-2 -> node-2'] },
        { title: '集中式调度方案', lines: ['ds-a: node-1 -> central', 'ds-b: 执行失败'] }
      ]
    })
  })

  it('reads the legacy form with the first line on the header line', () => {
    const parsed = parseSchedule('分布式调度方案:A: x -> y\nB: x -> z\n中心化调度方案:A: x -> c\nB: x -> c')
    expect(parsed.kind).toBe('comparison')
    expect(parsed.sections).toEqual([
      { title: '分布式调度方案', lines: ['A: x -> y', 'B: x -> z'] },
      { title: '集中式调度方案', lines: ['A: x -> c', 'B: x -> c'] }
    ])
  })

  it('keeps an empty mode block instead of dropping it', () => {
    expect(parseSchedule('分布式调度方案:A: x -> y\n中心化调度方案:').sections).toEqual([
      { title: '分布式调度方案', lines: ['A: x -> y'] },
      { title: '集中式调度方案', lines: [] }
    ])
  })

  it('maps legacy single-mode rows to the matching mode label', () => {
    expect(parseSchedule('CENTRALIZED方案:A: n1 -> central [CENTRALIZED]\nB: n2 -> central [CENTRALIZED]')).toEqual({
      kind: 'comparison',
      text: 'CENTRALIZED方案:A: n1 -> central [CENTRALIZED]\nB: n2 -> central [CENTRALIZED]',
      sections: [{ title: '集中式调度方案', lines: ['A: n1 -> central [CENTRALIZED]', 'B: n2 -> central [CENTRALIZED]'] }]
    })
    expect(parseSchedule('IN_PLACE方案:A: n1 -> n1 [IN_PLACE]').sections).toEqual([
      { title: '分布式调度方案', lines: ['A: n1 -> n1 [IN_PLACE]'] }
    ])
  })

  it('groups compute schedules from dataset management by target node', () => {
    const text = '调度目标节点 node-7:\nds-a: node-1 -> node-7 [复制]\nds-b: node-7 -> node-7 [原位]\n调度目标节点 node-8:\nds-c: node-2 -> node-8 [迁移]'
    expect(parseSchedule(text)).toEqual({
      kind: 'target',
      text,
      sections: [
        { title: '调度目标节点 node-7', lines: ['ds-a: node-1 -> node-7 [复制]', 'ds-b: node-7 -> node-7 [原位]'] },
        { title: '调度目标节点 node-8', lines: ['ds-c: node-2 -> node-8 [迁移]'] }
      ]
    })
  })

  it('tolerates CRLF, blank lines, surrounding spaces and full-width colons', () => {
    const parsed = parseSchedule('  分布式调度方案：\r\n\r\n  A: x -> y  \r\n中心化调度方案 :B: x -> c\r\n')
    expect(parsed.sections).toEqual([
      { title: '分布式调度方案', lines: ['A: x -> y'] },
      { title: '集中式调度方案', lines: ['B: x -> c'] }
    ])
    expect(parseSchedule('调度目标节点 node-9：A: x -> node-9 [复制]').sections).toEqual([
      { title: '调度目标节点 node-9', lines: ['A: x -> node-9 [复制]'] }
    ])
  })

  it('falls back to the raw text for anything it does not recognise', () => {
    const older = 'data1: nodeA -> nodeC\ndata2: nodeB -> nodeC'
    expect(parseSchedule(older)).toEqual({ kind: 'raw', sections: [], text: older })
    expect(parseSchedule('说明\n分布式调度方案:A: x -> y').kind).toBe('raw')
    expect(parseSchedule('分布式调度方案:A: x -> y\n调度目标节点 n1:\nB: x -> n1').kind).toBe('raw')
    expect(parseSchedule('分布式调度方案').kind).toBe('raw')
  })

  it('treats missing schedules as empty raw text', () => {
    expect(parseSchedule(null)).toEqual({ kind: 'raw', sections: [], text: '' })
    expect(parseSchedule(undefined)).toEqual({ kind: 'raw', sections: [], text: '' })
    expect(parseSchedule('  \n ')).toEqual({ kind: 'raw', sections: [], text: '' })
  })
})

it('detects failed dataset lines only by the failure marker at the end', () => {
  expect(scheduleLineFailed('ds-b: 执行失败')).toBe(true)
  expect(scheduleLineFailed('ds-b：执行失败 ')).toBe(true)
  expect(scheduleLineFailed('ds-a: node-1 -> node-2')).toBe(false)
  expect(scheduleLineFailed(null)).toBe(false)
})

describe('task dataset helpers', () => {
  it('prefers datasetIdsJson for the dataset count', () => {
    expect(taskDatasetCount({ datasetIdsJson: '[3,5,9]', selectedData: '[a]' })).toBe(3)
    expect(taskScopeLabel({ datasetIdsJson: '[3,5,9]' })).toBe('多数据集任务')
    expect(taskScopeLabel({ datasetIdsJson: '[3]' })).toBe('单数据集任务')
  })

  it('falls back to selectedData in Java list or JSON form', () => {
    expect(taskDatasetNames({ selectedData: '[iris, mnist]' })).toEqual(['iris', 'mnist'])
    expect(taskDatasetNames({ selectedData: '["iris","mnist"]' })).toEqual(['iris', 'mnist'])
    expect(taskDatasetNames({ selectedData: 'iris' })).toEqual(['iris'])
    expect(taskDatasetCount({ datasetIdsJson: null, selectedData: '[iris, mnist]' })).toBe(2)
    expect(taskScopeLabel({ selectedData: '[iris]' })).toBe('单数据集任务')
  })

  it('shows a dash when the datasets are unknown', () => {
    expect(taskDatasetNames({})).toEqual([])
    expect(taskDatasetNames(null)).toEqual([])
    expect(taskScopeLabel({ datasetIdsJson: '[]', selectedData: '' })).toBe('—')
  })
})

it('labels execution modes, including the combined comparison mode', () => {
  expect(executionModeLabel('COMPARISON')).toBe('分布式 + 集中式')
  expect(executionModeLabel('CENTRALIZED')).toBe('集中式')
  expect(executionModeLabel('in_place')).toBe('分布式')
  expect(executionModeLabel(null)).toBe('—')
  expect(executionModeLabel('OTHER')).toBe('OTHER')
})
