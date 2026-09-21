import GlobalHeader from '@/layout/components/GlobalHeader.vue'

jest.mock('@/components/BackendSettings', () => ({ name: 'BackendSettings', render: h => h('div') }))
jest.mock('@/api/adminApi', () => ({ fetchUsers: jest.fn() }))

describe('GlobalHeader route navigation', () => {
  it('supports router wrappers whose push method returns undefined', () => {
    const push = jest.fn()
    const context = { $route: { path: '/collaboration/jobs' }, $router: { push }}

    expect(() => GlobalHeader.methods.goToWorkspace.call(context)).not.toThrow()
    expect(push).toHaveBeenCalledWith('/workspace', expect.any(Function), expect.any(Function))
  })

  it('does not navigate when already on the workspace', () => {
    const push = jest.fn()
    const context = { $route: { path: '/workspace' }, $router: { push }}

    GlobalHeader.methods.goToWorkspace.call(context)
    expect(push).not.toHaveBeenCalled()
  })
})
