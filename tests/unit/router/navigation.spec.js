import router, { constantRoutes } from '@/router'

jest.mock('@/layout', () => ({ name: 'Layout', render: h => h('router-view') }))

const groups = constantRoutes.filter(route => !route.hidden)

describe('management navigation', () => {
  it('shows four top-level groups in the requested order', () => {
    expect(groups.map(route => route.meta.title)).toEqual([
      '资源注册中心', '网络中心', '数据管理', '任务管理'
    ])
    expect(groups.every(route => route.alwaysShow)).toBe(true)
    expect(new Set(constantRoutes.map(route => route.path)).size).toBe(constantRoutes.length)
  })

  it('keeps the existing registration navigation', () => {
    const registration = groups[0]
    expect(registration.path).toBe('/RegistrationCenter')
    expect(registration.redirect).toBe('/RegistrationCenter/NodeRegistry')
    expect(registration.children.map(route => [route.path, route.name, route.meta.title])).toEqual([
      ['NodeRegistry', 'NodeRegistry', '节点注册'],
      ['DatasetRegistry', 'DatasetRegistry', '数据集注册'],
      ['RuntimeImageRegistry', 'RuntimeImageRegistry', '运行镜像注册']
    ])
  })

  it('places external scheduling logs under data management, separate from task schedules', () => {
    expect(groups[2].children.map(route => route.meta.title)).toEqual(['数据集信息', '调度日志'])
    const route = router.match('/DataCenter/SchedulingLogs')
    expect(route.name).toBe('SchedulingLogs')
    expect(route.matched.map(record => record.meta.title)).toEqual(['数据管理', '调度日志'])
    expect(groups[3].children.map(route => route.meta.title)).toEqual(['数据选择', '任务列表', '调度展示', '性能分析'])
  })

  it.each([
    ['Settings', '网络中心', '网络配置'],
    ['FrameNet', '网络中心', '网络结构'],
    ['DataManagement', '数据管理', '数据集信息'],
    ['SelectData', '任务管理', '数据选择'],
    ['TaskList', '任务管理', '任务列表'],
    ['Schedule', '任务管理', '调度展示'],
    ['Analyze', '任务管理', '性能分析']
  ])('keeps the %s URL and resolves its new parent', (name, parentTitle, pageTitle) => {
    const route = router.match(`/ManagementCenter/${name}?taskId=42`)
    expect(route.name).toBe(name)
    expect(route.query).toEqual({ taskId: '42' })
    expect(route.matched.map(record => record.meta.title)).toEqual([parentTitle, pageTitle])
    expect(router.resolve({ name }).route.path).toBe(`/ManagementCenter/${name}`)
  })

  it.each([
    ['/', '/ManagementCenter/Settings'],
    ['/ManagementCenter', '/ManagementCenter/Settings'],
    ['/NetworkCenter', '/ManagementCenter/Settings'],
    ['/DataCenter', '/ManagementCenter/DataManagement'],
    ['/TaskCenter', '/ManagementCenter/SelectData']
  ])('opens the default page for %s', (path, target) => {
    expect(router.match(path).path).toBe(target)
  })
})
