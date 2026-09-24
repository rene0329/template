import { buildSpeedupOption, measurement } from '@/utils/analysis-chart'

it('plots speedup on its own scale and marks the 1.2x threshold', () => {
  const option = buildSpeedupOption([{ taskId: 72, rating: '1.507', t1: 1.162, t2: 1.751 }, { taskId: 73, rating: 0.8 }])
  expect(option.xAxis.data).toEqual(['任务 72', '任务 73'])
  expect(option.series[0].data).toEqual([1.507, 0.8])
  expect(option.series[0].markLine.data).toEqual([{ yAxis: 1.2 }])
  expect(option.series[0].markLine.label.formatter).toBe('1.2× 阈值')
  const tooltip = option.tooltip.formatter([{ dataIndex: 0 }])
  expect(tooltip).toContain('1.507×')
  expect(tooltip).toContain('1751.00 ms')
  expect(tooltip).toContain('1162.00 ms')
  expect(buildSpeedupOption([{ rating: 0.2 }]).yAxis.max).toBeGreaterThan(1)
})

it('starts the line axis at 0.9x on 0.1x ticks so clustered speedups are not flattened', () => {
  const rows = [{ taskId: 65, rating: 1.337, t1: 1 }, { taskId: 66, rating: 1.353, t1: 1 }]
  expect(buildSpeedupOption(rows).yAxis).toMatchObject({ min: 0.9, max: 1.6, interval: 0.1 })
  expect(buildSpeedupOption([{ rating: 1.507, t1: 1 }]).yAxis).toMatchObject({ min: 0.9, max: 1.8, interval: 0.1 })
})

it('keeps the threshold on the axis when every speedup is below it', () => {
  expect(buildSpeedupOption([{ rating: 1.0, t1: 1 }]).yAxis).toMatchObject({ min: 0.9, max: 1.4 })
})

it('lowers the line axis instead of clipping measurements below 0.9x', () => {
  const low = buildSpeedupOption([{ rating: 0.546, t1: 1 }, { rating: 1.35, t1: 1 }]).yAxis
  expect(low).toMatchObject({ min: 0.4, max: 1.6 })
  expect(low.interval).toBeUndefined()
  expect(buildSpeedupOption([{ rating: 0, t1: 1 }, { rating: 1.3, t1: 1 }]).yAxis.min).toBe(0)
})

it('keeps a zero baseline for bars', () => {
  const rows = [{ taskId: 65, rating: 1.337, t1: 1 }, { taskId: 66, rating: 1.353, t1: 1 }]
  expect(buildSpeedupOption(rows, 'bar').yAxis).toMatchObject({ min: 0, max: 1.6 })
})

it('keeps absent and non-finite measurements as gaps without discarding real zero', () => {
  const values = [null, undefined, '', ' ', Infinity, 'invalid', -1, false, 0]
  expect(values.map(measurement)).toEqual([null, null, null, null, null, null, null, null, 0])
  const option = buildSpeedupOption(values.map(rating => ({ rating })))
  expect(option.series[0].data).toEqual(values.map(measurement))
  expect(option.series[0].connectNulls).toBe(false)
  expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain('暂无数据')
})

it('switches to bars using the same values and enables scrolling for long pages', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ taskId: i + 1, rating: i / 10 }))
  const line = buildSpeedupOption(rows)
  const bar = buildSpeedupOption(rows, 'bar')
  expect(bar.series[0].type).toBe('bar')
  expect(bar.series[0].data).toEqual(line.series[0].data)
  expect(bar.dataZoom[0].endValue).toBe(9)
  expect(buildSpeedupOption(rows.slice(0, 1)).series[0].showSymbol).toBe(true)
})

it('does not present failed tasks with zero elapsed time as measured slowdowns', () => {
  const option = buildSpeedupOption([
    { taskId: 6, status: '执行失败', rating: 0, t1: 0, t2: 0 },
    { taskId: 7, rating: 0, t1: 1, t2: 0 }
  ])
  expect(option.series[0].data).toEqual([null, 0])
  expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain('加速比：暂无数据')
})
