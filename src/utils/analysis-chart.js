// Preserve missing measurements as gaps; they must never appear as zero speedup.
export function measurement(value) {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

// Failed tasks currently return T1=T2=rating=0. A zero denominator is not a measured 0x result.
export function speedupValue(row) {
  return measurement(row.t1) === 0 ? null : measurement(row.rating)
}

export function taskLabel(row) {
  const id = measurement(row.taskId)
  return id == null ? '任务 —' : `任务 ${id}`
}

export function speedupText(value) {
  const number = measurement(value)
  return number == null ? '暂无数据' : `${number.toFixed(3)}×`
}

export function milliseconds(value) {
  const number = measurement(value)
  return number == null ? '暂无数据' : `${(number * 1000).toFixed(2)} ms`
}

// The P4 acceptance threshold the speedup line is compared against.
export const SPEEDUP_THRESHOLD = 1.2

// Speedups cluster just above the threshold, so a zero-based line axis flattens them into a
// straight line: lines start at 0.9× (lower only when a measurement is), with 0.2× headroom
// above the highest point or the threshold, on 0.1× ticks so the threshold sits on a gridline.
// Bars keep a zero baseline because their length encodes the value.
function speedupAxisRange(values, chartType) {
  const measured = values.filter(value => value != null)
  const top = Math.max(SPEEDUP_THRESHOLD, ...measured)
  if (chartType === 'bar') return { min: 0, max: Math.ceil(top * 1.15 * 10) / 10 }
  const bottom = Math.max(0, Math.min(0.9, ...measured.map(value => value - 0.1)))
  const min = Math.floor(bottom * 10 + 1e-9) / 10
  const max = Math.ceil((top + 0.2) * 10 - 1e-9) / 10
  // Past a 1× span, 0.1× ticks crowd the axis; let ECharts pick the step instead.
  return max - min <= 1 + 1e-9 ? { min, max, interval: 0.1 } : { min, max }
}

export function buildSpeedupOption(rows, chartType = 'line') {
  const values = rows.map(speedupValue)
  const axisRange = speedupAxisRange(values, chartType)
  return {
    color: ['#158568'],
    grid: { left: 24, right: 72, top: 48, bottom: rows.length > 10 ? 92 : 48, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: chartType === 'bar' ? 'shadow' : 'line' },
      formatter: params => {
        const point = Array.isArray(params) ? params[0] : params
        const row = point && rows[point.dataIndex]
        if (!row) return ''
        // Only numeric measurements and fixed labels enter this HTML tooltip.
        return `${taskLabel(row)}<br/>数据移动加速比：${speedupText(speedupValue(row))}<br/>集中式耗时：${milliseconds(row.t2)}<br/>分布式耗时：${milliseconds(row.t1)}`
      }
    },
    xAxis: {
      type: 'category',
      data: rows.map(taskLabel),
      boundaryGap: chartType === 'bar',
      axisLine: { lineStyle: { color: '#d8e0e7' }},
      axisTick: { show: false },
      axisLabel: { color: '#576574' }
    },
    yAxis: {
      type: 'value',
      name: '加速比（倍）',
      ...axisRange,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#576574', formatter: '{value}×' },
      splitLine: { lineStyle: { color: '#edf1f5' }}
    },
    dataZoom: rows.length > 10 ? [
      { type: 'slider', startValue: 0, endValue: 9, bottom: 12, height: 22, borderColor: '#e4e9ed' }
    ] : [],
    series: [{
      name: '数据移动加速比',
      type: chartType,
      data: values,
      smooth: false,
      connectNulls: false,
      symbol: 'circle',
      symbolSize: 9,
      showSymbol: true,
      barMaxWidth: 48,
      lineStyle: { width: 3 },
      label: { show: rows.length <= 10, position: 'top', formatter: point => speedupText(point.value) },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#d39538', type: 'dashed', width: 2 },
        label: { formatter: `${SPEEDUP_THRESHOLD}× 阈值`, position: 'end', color: '#9b702d' },
        data: [{ yAxis: SPEEDUP_THRESHOLD }]
      }
    }]
  }
}
