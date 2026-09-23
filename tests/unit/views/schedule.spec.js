import Vue from 'vue'
import Schedule from '@/views/ManagementCenter/Schedule/index.vue'
import { fetchScheduleList } from '@/api/managementCenterApi'

jest.mock('@/api/managementCenterApi', () => ({ fetchScheduleList: jest.fn() }))

Vue.config.productionTip = false
Vue.config.devtools = false

// Minimal Element UI stand-ins: the table renders every row through each column's scoped slot.
const Pass = { render(h) { return h('div', this.$slots.default) } }
const Table = {
  props: ['data'],
  provide() { return { tableRows: () => this.data || [] } },
  render(h) { return h('div', { class: 'table-stub' }, this.$slots.default) }
}
const Column = {
  inject: ['tableRows'],
  props: ['prop', 'label'],
  render(h) {
    const slot = this.$scopedSlots.default
    return h('div', { class: 'column-stub' }, this.tableRows().map(row => (slot ? slot({ row }) : h('span', String(row[this.prop])))))
  }
}
const stubs = {
  ElContainer: Pass, ElMain: Pass, ElForm: Pass, ElFormItem: Pass, ElInput: Pass, ElButton: Pass,
  ElSelect: Pass, ElOption: Pass, ElPagination: Pass, ElTable: Table, ElTableColumn: Column
}

const rows = [
  { taskId: 7, taskName: '旧任务', createTime: '2026-09-01 08:00:00', schedule: 'data1: nodeA -> nodeC' },
  {
    taskId: 5,
    taskName: '对比任务-cmp-1',
    createTime: '2026-09-24 10:00:00',
    schedule: '分布式调度方案:\nds-a: n1 -> n1\nds-b: n2 -> n2\n中心化调度方案:\nds-a: n1 -> central\nds-b: 执行失败'
  },
  { taskId: 6, taskName: '计算调度', createTime: '2026-09-24 11:00:00', schedule: '调度目标节点 node-7:\nds-c: n3 -> node-7 [复制]' },
  {
    taskId: 8,
    taskName: '旧计算调度',
    createTime: '2026-09-10 08:39:49',
    manualSchedule: true,
    schedule: '分布式调度方案:nlpcc2013: alibj -> master-88 [COPY_AND_USE]\n中心化调度方案:'
  }
]

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const texts = (root, selector) => Array.from(root.querySelectorAll(selector)).map(node => node.textContent.trim())

beforeEach(() => {
  jest.resetAllMocks()
  fetchScheduleList.mockResolvedValue({ list: rows, total: rows.length })
})

it('renders one row per task with structured schedule blocks in the schedule cell', async() => {
  const vm = new Vue({ extends: Schedule, components: stubs }).$mount()
  await flush()
  await vm.$nextTick()

  expect(fetchScheduleList).toHaveBeenCalledWith(1, 100, '')
  expect(vm.TaskData.map(row => row.taskId)).toEqual([7, 5, 6, 8])
  const cells = vm.$el.querySelectorAll('.schedule-cell')
  expect(cells).toHaveLength(4)

  // Rows are sorted by task id: 5 (comparison), 6 (target node), 7 (unrecognised), 8 (legacy compute schedule).
  expect(texts(cells[0], '.schedule-title')).toEqual(['分布式调度方案', '集中式调度方案'])
  const [distributed, centralized] = cells[0].querySelectorAll('.schedule-section')
  expect(texts(distributed, '.schedule-line')).toEqual(['ds-a: n1 -> n1', 'ds-b: n2 -> n2'])
  expect(texts(centralized, '.schedule-line')).toEqual(['ds-a: n1 -> central', 'ds-b: 执行失败'])
  expect(texts(cells[0], '.schedule-line.is-failed')).toEqual(['ds-b: 执行失败'])
  expect(cells[0].textContent).not.toContain('中心化')

  expect(texts(cells[1], '.schedule-title')).toEqual(['调度目标节点 node-7'])
  expect(texts(cells[1], '.schedule-line')).toEqual(['ds-c: n3 -> node-7 [复制]'])

  expect(cells[2].querySelector('.schedule-section')).toBeNull()
  expect(texts(cells[2], '.schedule-raw')).toEqual(['data1: nodeA -> nodeC'])

  // A 数据集管理 compute schedule is one scheduling by target node, never a distributed/centralized pair.
  expect(texts(cells[3], '.schedule-title')).toEqual(['调度目标节点 master-88'])
  expect(texts(cells[3], '.schedule-line')).toEqual(['nlpcc2013: alibj -> master-88 [复制]'])
  expect(cells[3].textContent).not.toContain('分布式')
  expect(cells[3].textContent).not.toContain('集中式')
  vm.$destroy()
})

it('searches by exact task id or by task name on the client', async() => {
  const vm = new Vue({ extends: Schedule, components: stubs }).$mount()
  await flush()

  vm.formInline.name = '6'
  await vm.fetchData()
  expect(vm.TaskData.map(row => row.taskId)).toEqual([6])

  vm.formInline.name = '对比任务'
  await vm.fetchData()
  expect(vm.TaskData.map(row => row.taskId)).toEqual([5])
  expect(vm.total).toBe(1)
  expect(fetchScheduleList).toHaveBeenLastCalledWith(1, 100, '')
  vm.$destroy()
})

it('prefills the search from a taskId route query', () => {
  const vm = { ...Schedule.data(), $route: { query: { taskId: 5 }}, fetchData: jest.fn() }
  Schedule.created.call(vm)
  expect(vm.formInline.name).toBe('5')
  expect(vm.fetchData).toHaveBeenCalled()
})
