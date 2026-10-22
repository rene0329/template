// 只转换计算语境，保留分布式存储、协同缓存等术语及原始记录。
export function computationTextForDisplay(value) {
  return String(value == null ? '' : value)
    .replace(/分布式调度方案/g, '原位调度方案')
    .replace(/分布式执行/g, '原位执行')
    .replace(/分布式任务/g, '原位计算任务')
    .replace(/分布式计算/g, '原位计算')
    .replace(/分布式(?=数据移动|总搬运|搬运|耗时|计时|节点|路径|参考节点|与集中式|／集中式)/g, '原位计算')
    .replace(/集中式(?!计算|调度方案)/g, '集中式计算')
}
