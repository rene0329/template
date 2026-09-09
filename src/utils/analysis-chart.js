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

export function buildSpeedupOption(rows, chartType = 'line') {
  const values = rows.map(speedupValue)
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
      min: 0,
      max: Math.ceil(Math.max(1, ...values.filter(value => value != null)) * 1.15 * 10) / 10,
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
        label: { formatter: '1× 基准', position: 'end', color: '#9b702d' },
        data: [{ yAxis: 1 }]
      }
    }]
  }
}
