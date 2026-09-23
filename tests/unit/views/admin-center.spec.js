import { mount, createLocalVue } from '@vue/test-utils'
import AdminCenter from '@/views/AdminCenter/index.vue'
import fs from 'fs'
import path from 'path'
import { fetchRegisteredNodes } from '@/api/registrationApi'
import { createDomain, fetchDomains, fetchUsers, updateDomain } from '@/api/adminApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredNodes: jest.fn() }))
jest.mock('@/api/adminApi', () => ({
  createDomain: jest.fn(), createUser: jest.fn(), fetchDomains: jest.fn(),
  fetchUsers: jest.fn(), resetUserPassword: jest.fn(), updateDomain: jest.fn(), updateUser: jest.fn()
}))

const node = (nodeId, k8sNodeName, siteCode, displayName = k8sNodeName) => ({ nodeId, k8sNodeName, displayName, siteCode, role: 'STORAGE' })
const NODES = [
  node(1, 'master-40', 'core'), node(2, 'master-141', 'core'), node(3, 'master-215', 'core'),
  node(11, 'cluster-sh-1', 'sh'), node(12, 'cluster-sh-2', 'sh', '上海-2'), node(13, 'cluster-sh-3', 'sh'),
  node(21, 'cluster-sz-1', 'sz'), node(31, 'edge-unassigned', null)
]
const DOMAINS = [
  { id: 1, code: 'domain-a', name: '上海域（A）', description: '上海站点', siteCode: 'sh', enabled: true },
  { id: 2, code: 'domain-b', name: '深圳域（B）', siteCode: 'sz', enabled: true },
  { id: 5, code: 'core', name: '中心域', siteCode: 'core', enabled: true },
  { id: 6, code: 'domain-e', name: '新建域', siteCode: null, enabled: true },
  { id: 7, code: 'domain-x', name: '旧站点域', siteCode: 'gz', enabled: false }
]
const USERS = [{ id: 8, username: 'owner-a', displayName: '上海用户', roles: ['DATA_OWNER'], domainId: 1, domainName: '上海域（A）', enabled: true }]
const page = list => ({ list, total: list.length })
const flush = () => new Promise(resolve => setTimeout(resolve))

function mockBackend() {
  fetchDomains.mockResolvedValue(DOMAINS)
  fetchUsers.mockResolvedValue(USERS)
  fetchRegisteredNodes.mockResolvedValue(page(NODES))
}

function context() {
  const vm = {
    ...AdminCenter.data.call({ $route: { query: {}}}),
    $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() }
  }
  Object.entries(AdminCenter.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(AdminCenter.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { configurable: true, get: () => get.call(vm) }))
  return vm
}

beforeEach(() => jest.resetAllMocks())

it('loads registered nodes and shows the site and member nodes of each domain', async() => {
  const vm = context()
  mockBackend()

  await vm.loadAll()

  expect(fetchRegisteredNodes).toHaveBeenCalledWith({ page: 1, pageSize: 100 }, {})
  expect(vm.loading).toBe(false)
  expect(vm.$message.error).not.toHaveBeenCalled()
  expect(vm.domains.map(domain => [domain.name, vm.domainSite(domain), vm.domainNodeNames(domain)])).toEqual([
    ['上海域（A）', 'sh', 'cluster-sh-1、上海-2、cluster-sh-3'],
    ['深圳域（B）', 'sz', 'cluster-sz-1'],
    ['中心域', 'core', 'master-40、master-141、master-215'],
    ['新建域', '—', '—'],
    ['旧站点域', 'gz', '—']
  ])
})

it('offers the distinct registered node sites, plus the current one, as domain site options', () => {
  const vm = context()
  vm.nodes = NODES

  vm.openDomain()
  expect(vm.domainDialog).toBe(true)
  expect(vm.domainForm).toEqual({ id: null, code: '', name: '', description: '', siteCode: null })
  expect(vm.siteOptions).toEqual([
    { value: 'core', label: 'core（master-40、master-141、master-215）' },
    { value: 'sh', label: 'sh（cluster-sh-1、上海-2、cluster-sh-3）' },
    { value: 'sz', label: 'sz（cluster-sz-1）' }
  ])

  vm.openDomain(DOMAINS[0])
  expect(vm.domainForm).toMatchObject({ id: 1, code: 'domain-a', siteCode: 'sh' })
  expect(vm.siteOptions.map(option => option.value)).toEqual(['core', 'sh', 'sz'])

  vm.openDomain(DOMAINS[4])
  expect(vm.domainForm).toMatchObject({ id: 7, siteCode: 'gz' })
  expect(vm.siteOptions.map(option => option.value)).toEqual(['core', 'sh', 'sz', 'gz'])
  expect(vm.siteOptions[3].label).toBe('gz（暂无节点）')
})

it('sends the selected site on create and update and null when it is cleared', async() => {
  const vm = context()
  mockBackend()
  createDomain.mockResolvedValue({ id: 9 })
  updateDomain.mockResolvedValue({})

  vm.openDomain()
  Object.assign(vm.domainForm, { code: 'domain-d', name: '杭州域（D）', siteCode: 'hz' })
  await vm.saveDomain()
  expect(createDomain).toHaveBeenLastCalledWith({ code: 'domain-d', name: '杭州域（D）', description: '', siteCode: 'hz' })
  expect(vm.domainDialog).toBe(false)
  expect(vm.$message.success).toHaveBeenCalledWith('业务域已保存')

  vm.openDomain()
  Object.assign(vm.domainForm, { code: 'domain-f', name: '无站点域' })
  await vm.saveDomain()
  expect(createDomain).toHaveBeenLastCalledWith({ code: 'domain-f', name: '无站点域', description: '', siteCode: null })

  vm.openDomain(DOMAINS[3])
  vm.domainForm.siteCode = 'sz'
  await vm.saveDomain()
  expect(updateDomain).toHaveBeenLastCalledWith(6, { code: 'domain-e', name: '新建域', description: '', siteCode: 'sz' })

  // el-select 清空后回填空字符串，提交时应解除站点对应。
  vm.openDomain(DOMAINS[0])
  vm.domainForm.siteCode = ''
  await vm.saveDomain()
  expect(updateDomain).toHaveBeenLastCalledWith(1, { code: 'domain-a', name: '上海域（A）', description: '上海站点', siteCode: null })
  expect(vm.$message.error).not.toHaveBeenCalled()
  expect(fetchDomains).toHaveBeenCalledTimes(4)
})

it('keeps the domain site when enabling or disabling a domain', async() => {
  const vm = context()
  mockBackend()
  updateDomain.mockResolvedValue({})

  await vm.toggleDomain(DOMAINS[0])
  await vm.toggleDomain(DOMAINS[4])
  await vm.toggleDomain(DOMAINS[3])

  expect(updateDomain.mock.calls).toEqual([
    [1, { enabled: false, siteCode: 'sh' }],
    [7, { enabled: true, siteCode: 'gz' }],
    [6, { enabled: false, siteCode: null }]
  ])
})

it('explains that a site already belongs to another domain and keeps the dialog open', async() => {
  const vm = context()
  vm.nodes = NODES
  updateDomain.mockRejectedValueOnce(Object.assign(new Error('site is already mapped to another domain'), { status: 409, errorCode: 'DOMAIN_SITE_TAKEN' }))

  vm.openDomain(DOMAINS[3])
  vm.domainForm.siteCode = 'sh'
  await vm.saveDomain()

  expect(updateDomain).toHaveBeenCalledWith(6, { code: 'domain-e', name: '新建域', description: '', siteCode: 'sh' })
  expect(vm.$message.error).toHaveBeenCalledWith('保存失败：该站点已对应其他业务域')
  expect(vm.domainDialog).toBe(true)
  expect(vm.saving).toBe(false)
  expect(fetchDomains).not.toHaveBeenCalled()

  createDomain.mockRejectedValueOnce(Object.assign(new Error('domain code already exists'), { status: 409, errorCode: 'DOMAIN_CODE_EXISTS' }))
  vm.openDomain()
  Object.assign(vm.domainForm, { code: 'domain-a', name: '重复域' })
  await vm.saveDomain()
  expect(vm.$message.error).toHaveBeenLastCalledWith('保存失败：domain code already exists')
  expect(vm.domainDialog).toBe(true)
})

it('has no dataset holder section: only domain and user management remain', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/views/AdminCenter/index.vue'), 'utf8')
  expect(source).not.toMatch(/数据归属|调整归属|assignDatasetOwner|ownerUserId|ownerDialog/)
  expect(source).toContain('<el-tab-pane label="域管理" name="domains">')
  expect(source).toContain('<el-tab-pane label="用户管理" name="users">')
  expect(source.match(/<el-tab-pane /g)).toHaveLength(2)

  // 旧书签 ?tab=datasets 落到默认的域管理标签页。
  const vm = { ...AdminCenter.data.call({ $route: { query: { tab: 'datasets' }}}) }
  expect(vm.activeTab).toBe('domains')
  expect(AdminCenter.data.call({ $route: { query: { tab: 'users' }}}).activeTab).toBe('users')
})

it('renders domain sites and member nodes', async() => {
  mockBackend()
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
  const wrapper = mount(AdminCenter, {
    localVue,
    mocks: { $route: { query: {}}, $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() }},
    stubs: {
      'el-container': Passthrough, 'el-main': Passthrough, 'el-tabs': Passthrough, 'el-alert': Passthrough, 'el-input': Passthrough,
      'el-form': Passthrough, 'el-form-item': Passthrough, 'el-select': Passthrough, 'el-option-group': Passthrough,
      'el-option': { props: { label: { type: String, default: '' }}, render(h) { return h('span', { class: 'option' }, this.label) } },
      'el-tab-pane': { props: { name: { type: String, default: '' }}, render(h) { return h('section', { attrs: { 'data-tab': this.name }}, this.$slots.default) } },
      'el-table': TableStub, 'el-table-column': ColumnStub,
      'el-tag': { render(h) { return h('span', { class: 'tag' }, this.$slots.default) } },
      'el-button': { render(h) { return h('button', { on: { click: event => this.$emit('click', event) }}, this.$slots.default) } },
      'el-dialog': { props: { visible: Boolean }, render(h) { return h('div', { class: 'dialog' }, this.visible ? [this.$slots.default, this.$slots.footer] : []) } }
    }
  })
  await flush()
  await flush()

  const cells = (tab, label) => wrapper.findAll(`[data-tab="${tab}"] [data-label="${label}"] .cell`).wrappers.map(cell => cell.text())
  expect(cells('domains', '对应站点')).toEqual(['sh', 'sz', 'core', '—', 'gz'])
  expect(cells('domains', '包含节点')).toEqual([
    'cluster-sh-1、上海-2、cluster-sh-3', 'cluster-sz-1', 'master-40、master-141、master-215', '—', '—'
  ])
  expect(cells('users', '业务域')).toEqual(['上海域（A）'])
  expect(wrapper.find('[data-tab="datasets"]').exists()).toBe(false)

  wrapper.findAll('[data-tab="domains"] [data-label="操作"] .cell').at(4).find('button').trigger('click')
  await flush()
  expect(wrapper.vm.domainForm).toMatchObject({ id: 7, siteCode: 'gz' })
  expect(wrapper.findAll('.dialog .option').wrappers.map(option => option.text())).toEqual([
    'core（master-40、master-141、master-215）', 'sh（cluster-sh-1、上海-2、cluster-sh-3）', 'sz（cluster-sz-1）', 'gz（暂无节点）'
  ])
  wrapper.destroy()
})
