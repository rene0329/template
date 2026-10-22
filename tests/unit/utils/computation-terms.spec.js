import { computationTextForDisplay } from '@/utils/computation-terms'
import { scheduleTextForDisplay } from '@/utils/schedule-text'

it('normalizes legacy task and log descriptions while preserving storage terminology', () => {
  const source = '分布式任务：分布式执行，分布式数据移动总耗时=2秒，集中式耗时=3秒；分布式存储、分布式协同缓存'
  const expected = '原位计算任务：原位执行，原位计算数据移动总耗时=2秒，集中式计算耗时=3秒；分布式存储、分布式协同缓存'
  expect(computationTextForDisplay(source)).toBe(expected)
  expect(computationTextForDisplay(expected)).toBe(expected)
  expect(scheduleTextForDisplay('说明：分布式调度方案')).toBe('说明：原位调度方案')
})
