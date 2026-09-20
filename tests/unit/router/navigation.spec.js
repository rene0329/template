import router, { constantRoutes } from '@/router'

jest.mock('@/layout', () => ({ name: 'Layout', render: h => h('router-view') }))

const groups = constantRoutes.filter(route => !route.hidden)

describe('business navigation', () => {
  it('shows the top-level groups in business-flow order', () => {
    expect(groups.map(route => route.children[0].name === 'Workspace' ? route.children[0].meta.title : route.meta.title)).toEqual([
      '工作台', '资源与数据', '协同计算', '任务运行', '系统日志', '系统支持'
    ])
    expect(groups.slice(1).every(route => route.alwaysShow)).toBe(true)
    expect(new Set(constantRoutes.map(route => route.path)).size).toBe(constantRoutes.length)
  })

  it('places performance analysis under task operations', () => {
    const operations = groups.find(route => route.name === 'OperationsCenter')
    expect(operations.children.map(route => [route.path, route.name, route.meta.title])).toEqual([
      ['data-selection', 'SelectData', '数据选择'],
      ['tasks', 'TaskList', '任务列表'],
      ['schedules', 'Schedule', '调度结果'],
      ['analysis', 'Analyze', '性能分析']
    ])
  })

  it('uses the requested system log names', () => {
    const logs = groups.find(route => route.name === 'SystemLogs')
    expect(logs.children.map(route => [route.path, route.name, route.meta.title])).toEqual([
      ['abnormal-access', 'SecurityValidation', '异常访问日志'],
      ['scheduling', 'SchedulingLogs', '调度执行日志'],
      ['privacy', 'PrivacyLogs', '隐私计算日志']
    ])
  })

  it('exposes dedicated privacy routes, including task detail', () => {
    const collaboration = groups.find(route => route.name === 'CollaborationCenter')
    expect(collaboration.children.map(route => [route.path, route.name, route.meta.title])).toEqual([
      ['capabilities', 'PrivacyCapabilities', '能力与模板'],
      ['jobs/new', 'PrivacyJobCreate', '创建隐私任务'],
      ['jobs', 'PrivacyJobs', '协同任务'],
      ['jobs/:jobId', 'PrivacyJobDetail', '任务详情']
    ])
    const detail = router.match('/collaboration/jobs/job-42')
    expect(detail.name).toBe('PrivacyJobDetail')
    expect(detail.params.jobId).toBe('job-42')
    expect(detail.matched.map(record => record.meta.title)).toEqual(['协同计算', '任务详情'])
  })

  it.each([
    ['NodeRegistry', '/resources/nodes', '资源与数据', '节点资源'],
    ['DataManagement', '/resources/datasets/manage', '资源与数据', '数据集管理'],
    ['PrivacyCapabilities', '/collaboration/capabilities', '协同计算', '能力与模板'],
    ['Analyze', '/operations/analysis', '任务运行', '性能分析'],
    ['SecurityValidation', '/logs/abnormal-access', '系统日志', '异常访问日志'],
    ['ExternalApi', '/support/external-api', '系统支持', '对外接口']
  ])('resolves %s to its canonical business route', (name, path, parentTitle, pageTitle) => {
    const route = router.match(`${path}?taskId=42`)
    expect(route.name).toBe(name)
    expect(route.query).toEqual({ taskId: '42' })
    expect(route.matched.map(record => record.meta.title)).toEqual([parentTitle, pageTitle])
    expect(router.resolve({ name }).route.path).toBe(path)
  })

  it.each([
    ['/', '/workspace'],
    ['/RegistrationCenter/NodeRegistry?source=old#part', '/resources/nodes?source=old#part'],
    ['/ManagementCenter/PrivacyComputing?jobId=42', '/collaboration/capabilities?jobId=42'],
    ['/ManagementCenter/Analyze', '/operations/analysis'],
    ['/DataCenter/SchedulingLogs', '/logs/scheduling'],
    ['/HelpCenter/ExternalApi', '/support/external-api']
  ])('redirects legacy URL %s to %s', (path, target) => {
    expect(router.match(path).fullPath).toBe(target)
  })
})
