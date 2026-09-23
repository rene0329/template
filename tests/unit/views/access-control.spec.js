import { mount, createLocalVue } from '@vue/test-utils'
import AccessControl from '@/views/SecurityCenter/AccessControl/index.vue'
import { fetchDatasetAccess, requestDatasetAccessGrant } from '@/api/accessControlApi'
import { parseTime } from '@/utils'

jest.mock('@/api/accessControlApi', () => ({ fetchDatasetAccess: jest.fn(), requestDatasetAccessGrant: jest.fn() }))

const START = Date.parse('2026-09-24T02:00:00.000Z')
const iso = ms => new Date(ms).toISOString()
const dataset = (id, fields = {}) => ({
  datasetId: id, name: `数据集 ${id}`, datasetCode: `ds-${id}`, version: 'v1', status: 'ACTIVE',
  ownerDomainId: 2, ownerDomainName: 'B 域', accessible: false, basis: null,
  grantId: null, grantExpiresAt: null, grantReason: null, ...fields
})
const payload = (items, serverTime = START, ttlMinutes = 30) => ({ serverTime: iso(serverTime), ttlMinutes, items })
const flush = async() => { for (let i = 0; i < 20; i++) await Promise.resolve() }

function context() {
  const vm = {
    ...AccessControl.data(),
    $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() }
  }
  Object.entries(AccessControl.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(AccessControl.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { configurable: true, get: () => get.call(vm) }))
  return vm
}

let clock

beforeEach(() => {
  jest.resetAllMocks()
  clock = START
  jest.spyOn(Date, 'now').mockImplementation(() => clock)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

it('explains why each dataset is available and shows grant time left in server time', async() => {
  const vm = context()
  const grantExpiresAt = START + 5000 + (23 * 60 + 30) * 1000
  fetchDatasetAccess.mockResolvedValue(payload([
    dataset(1, { accessible: true, basis: 'ADMIN' }),
    dataset(2, { accessible: true, basis: 'OWN_DOMAIN', ownerDomainName: 'A 域' }),
    dataset(3, { accessible: true, basis: 'GRANT', grantId: 'g-3', grantExpiresAt: iso(grantExpiresAt) }),
    dataset(4)
  ], START + 5000))

  await vm.load()

  expect(fetchDatasetAccess).toHaveBeenCalledWith({ silent: false })
  expect(vm.clockOffset).toBe(5000)
  expect(vm.ttlMinutes).toBe(30)
  expect(vm.rows.map(row => [row.access.label, row.access.type, row.access.detail])).toEqual([
    ['可用', 'success', '管理员'],
    ['可用', 'success', '本域数据'],
    ['可用', 'success', '临时授权，剩余 23 分钟'],
    ['不可用', 'info', '需申请临时令牌']
  ])
  expect(vm.rows[2].access.expiresAt).toBe(parseTime(new Date(grantExpiresAt)))
  expect(vm.rows.map(row => vm.canApply(row))).toEqual([false, false, false, true])
  expect(vm.accessibleCount).toBe(3)
})

it('searches all datasets by name, code, version and owner domain', () => {
  const vm = context()
  vm.items = [dataset(1, { ownerDomainName: 'A 域' }), dataset(2, { datasetCode: 'census', version: 'v2' })]
  vm.query = ' CENSUS '
  expect(vm.rows.map(row => row.datasetId)).toEqual([2])
  vm.query = 'a 域'
  expect(vm.rows.map(row => row.datasetId)).toEqual([1])
  vm.query = 'missing'
  expect(vm.rows).toEqual([])
  expect(vm.emptyText).toBe('没有匹配的数据集')
})

it('requires an application reason of at most 500 characters before requesting a grant', async() => {
  const vm = context()
  vm.ttlMinutes = 30
  fetchDatasetAccess.mockResolvedValue(payload([dataset(4, { accessible: true, basis: 'GRANT', grantExpiresAt: iso(START + 30 * 60000) })]))
  requestDatasetAccessGrant.mockResolvedValue({ grantId: 'g-4', datasetId: 4, expiresAt: iso(START + 30 * 60000), ttlMinutes: 30 })

  vm.openApply(dataset(4))
  expect(vm.apply.visible).toBe(true)
  expect(vm.validityText).toBe('有效期 30 分钟')

  await vm.submitApply()
  expect(vm.apply.touched).toBe(true)
  expect(vm.reasonError).toBe('请填写申请说明')
  vm.apply.reason = 'x'.repeat(501)
  expect(vm.reasonError).toBe('申请说明不能超过 500 个字符')
  await vm.submitApply()
  expect(requestDatasetAccessGrant).not.toHaveBeenCalled()

  vm.apply.reason = '  联合建模需要读取 B 域样本  '
  await vm.submitApply()

  expect(requestDatasetAccessGrant).toHaveBeenCalledWith(4, '联合建模需要读取 B 域样本')
  expect(vm.apply.visible).toBe(false)
  expect(vm.apply.submitting).toBe(false)
  expect(vm.$message.success).toHaveBeenCalledWith('已获得「数据集 4」的临时访问令牌，有效期 30 分钟')
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(1)
  expect(vm.rows[0].access).toMatchObject({ label: '可用', detail: '临时授权，剩余 30 分钟' })
})

it('refreshes on a grant conflict but keeps the dialog open on validation errors', async() => {
  const vm = context()
  fetchDatasetAccess.mockResolvedValue(payload([]))
  requestDatasetAccessGrant.mockRejectedValueOnce(Object.assign(new Error('conflict'), { status: 409, errorCode: 'GRANT_ALREADY_ACTIVE' }))
  vm.openApply(dataset(4))
  vm.apply.reason = '复核'
  await vm.submitApply()
  expect(vm.$message.warning).toHaveBeenCalledWith('该数据集已有生效中的临时授权')
  expect(vm.apply.visible).toBe(false)
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(1)

  requestDatasetAccessGrant.mockRejectedValueOnce(Object.assign(new Error('申请说明过长'), { status: 400 }))
  vm.openApply(dataset(4))
  vm.apply.reason = '复核'
  await vm.submitApply()
  expect(vm.$message.error).toHaveBeenCalledWith('申请失败：申请说明过长')
  expect(vm.apply.visible).toBe(true)
  expect(vm.apply.submitting).toBe(false)
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(1)
})

it('counts a grant down, flips it to unavailable at expiry and refetches without a manual reload', async() => {
  jest.useFakeTimers()
  const serverStart = START + 5000
  fetchDatasetAccess
    .mockResolvedValue(payload([dataset(7)], serverStart + 60000))
    .mockResolvedValueOnce(payload([dataset(7, { accessible: true, basis: 'GRANT', grantId: 'g-7', grantExpiresAt: iso(serverStart + 40000) })], serverStart))
    .mockResolvedValueOnce(payload([dataset(7)], serverStart + 41000))
  const advance = async seconds => {
    for (let i = 0; i < seconds; i++) {
      clock += 1000
      jest.advanceTimersByTime(1000)
      await flush()
    }
  }
  const vm = context()
  AccessControl.created.call(vm)
  await flush()

  expect(vm.rows[0].access.detail).toBe('临时授权，剩余 40 秒')
  await advance(39)
  expect(vm.rows[0].access.detail).toBe('临时授权，剩余 1 秒')
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(1)

  await advance(1)
  expect(vm.rows[0].access).toMatchObject({ label: '不可用', detail: '临时授权已到期' })
  expect(vm.canApply(vm.rows[0])).toBe(true)

  await advance(1)
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(2)
  expect(fetchDatasetAccess).toHaveBeenLastCalledWith({ silent: true })
  expect(vm.items[0].accessible).toBe(false)
  expect(vm.expiryTimer).toBe(null)

  await advance(19)
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(3)

  AccessControl.beforeDestroy.call(vm)
  await advance(120)
  expect(fetchDatasetAccess).toHaveBeenCalledTimes(3)
})

it('renders the apply button only on unavailable rows', async() => {
  jest.useFakeTimers()
  fetchDatasetAccess.mockResolvedValue(payload([
    dataset(1, { accessible: true, basis: 'OWN_DOMAIN' }),
    dataset(2, { accessible: true, basis: 'GRANT', grantExpiresAt: iso(START + 10 * 60000) }),
    dataset(3)
  ]))
  const localVue = createLocalVue()
  localVue.directive('loading', {})
  const Passthrough = { render(h) { return h('div', [this.$slots.default, this.$slots.footer]) } }
  const TableStub = {
    props: { data: { type: Array, default: () => [] }},
    provide() { return { tableStub: this } },
    render(h) { return h('div', this.$slots.default) }
  }
  const ColumnStub = {
    props: { label: { type: String, default: '' }, prop: { type: String, default: '' }},
    inject: ['tableStub'],
    render(h) {
      const slot = this.$scopedSlots.default
      return h('div', { attrs: { 'data-label': this.label }}, this.tableStub.data.map(row => h('div', { class: 'cell' }, slot ? slot({ row }) : String(row[this.prop]))))
    }
  }
  const wrapper = mount(AccessControl, {
    localVue,
    mocks: { $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() }},
    stubs: {
      'el-container': Passthrough, 'el-main': Passthrough, 'el-alert': Passthrough, 'el-input': Passthrough,
      'el-form': Passthrough, 'el-form-item': Passthrough, 'el-descriptions': Passthrough, 'el-descriptions-item': Passthrough,
      'el-table': TableStub, 'el-table-column': ColumnStub,
      'el-tag': { render(h) { return h('span', { class: 'tag' }, this.$slots.default) } },
      'el-button': { render(h) { return h('button', { on: { click: event => this.$emit('click', event) }}, this.$slots.default) } },
      'el-dialog': { props: { visible: Boolean }, render(h) { return h('div', { class: 'dialog' }, this.visible ? [this.$slots.default, this.$slots.footer] : []) } }
    }
  })
  await flush()

  const status = wrapper.findAll('[data-label="状态"] .cell')
  expect(status.wrappers.map(cell => cell.find('.tag').text())).toEqual(['可用', '可用', '不可用'])
  expect(status.at(0).text()).toContain('本域数据')
  expect(status.at(1).text()).toContain('临时授权，剩余 10 分钟')
  const actions = wrapper.findAll('[data-label="操作"] .cell')
  expect(actions.wrappers.map(cell => cell.findAll('button').length)).toEqual([0, 0, 1])

  actions.at(2).find('button').trigger('click')
  expect(wrapper.vm.apply.visible).toBe(true)
  expect(wrapper.vm.apply.dataset.datasetId).toBe(3)
  await flush()
  expect(wrapper.find('.dialog').text()).toContain('数据集 3')
  wrapper.destroy()
})
