import { mount, RouterLinkStub } from '@vue/test-utils'
import Workspace from '@/views/Workspace/index.vue'
import { fetchRegisteredDatasets, fetchRegisteredNodes, fetchRuntimeImages } from '@/api/registrationApi'
import { fetchTaskList } from '@/api/managementCenterApi'
import { fetchPrivacyCapabilities, fetchPrivacyJobs, fetchPrivacyTemplates } from '@/api/privacyComputingApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredDatasets: jest.fn(), fetchRegisteredNodes: jest.fn(), fetchRuntimeImages: jest.fn() }))
jest.mock('@/api/managementCenterApi', () => ({ fetchTaskList: jest.fn() }))
jest.mock('@/api/privacyComputingApi', () => ({ fetchPrivacyCapabilities: jest.fn(), fetchPrivacyJobs: jest.fn(), fetchPrivacyTemplates: jest.fn() }))

const Plain = { render(h) { return h('span', this.$slots.default) } }
const settle = () => new Promise(resolve => setTimeout(resolve))

function mountWorkspace() {
  return mount(Workspace, {
    stubs: { RouterLink: RouterLinkStub, 'el-button': Plain, 'el-tag': Plain, 'el-alert': Plain },
    mocks: { $store: { getters: { name: '域用户甲', roles: ['DATA_OWNER'], domain: { name: 'A 域' }}}}
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  fetchRegisteredNodes.mockResolvedValue({ list: [], total: 3 })
  fetchRegisteredDatasets.mockResolvedValue({ list: [], total: 5 })
  fetchRuntimeImages.mockResolvedValue({ list: [], total: 2 })
  fetchTaskList.mockResolvedValue({ list: [], total: 7 })
})

it('hides the collaboration entry points while the collaboration menu is hidden', async() => {
  const wrapper = mountWorkspace()
  await settle()

  expect(wrapper.vm.showCollaboration).toBe(false)
  expect(wrapper.vm.isDataOwner).toBe(true)
  const text = wrapper.text()
  expect(text).not.toContain('发起隐私计算')
  expect(text).not.toContain('协同任务')
  expect(text).not.toContain('隐私协同状态')
  expect(text).not.toContain('协议模板')
  expect(wrapper.findAll('.flow-item strong').wrappers.map(item => item.text())).toEqual(['资源与数据', '任务运行', '安全中心', '系统日志'])
  expect(wrapper.findAll('.metric-card')).toHaveLength(4)
  expect(wrapper.find('.metric-grid').classes()).toContain('four-up')
})

it('links only to canonical business routes', async() => {
  const wrapper = mountWorkspace()
  await settle()

  const targets = wrapper.findAll(RouterLinkStub).wrappers.map(link => link.props('to'))
  expect(targets).toEqual(expect.arrayContaining(['/resources/datasets/register', '/security/access']))
  expect(targets.every(path => /^\/(resources|operations|security|logs)\//.test(path))).toBe(true)
})

it('does not request privacy data while collaboration is hidden', async() => {
  const wrapper = mountWorkspace()
  await settle()

  expect(fetchPrivacyCapabilities).not.toHaveBeenCalled()
  expect(fetchPrivacyTemplates).not.toHaveBeenCalled()
  expect(fetchPrivacyJobs).not.toHaveBeenCalled()
  expect(wrapper.vm.overview).toMatchObject({ nodes: 3, datasets: 5, images: 2, tasks: 7 })
  expect(wrapper.vm.errors).toEqual([])
  expect(wrapper.vm.loading).toBe(false)
})
