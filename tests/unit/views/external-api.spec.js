import ExternalApi from '@/views/HelpCenter/ExternalApi/index.vue'

function context() {
  const vm = ExternalApi.data()
  Object.entries(ExternalApi.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  vm.$message = { success: jest.fn(), error: jest.fn() }
  return vm
}

describe('external API documentation', () => {
  it('documents exactly the two public scheduling interfaces', () => {
    const vm = context()
    expect(vm.apis.map(api => [api.id, api.method, api.path])).toEqual([
      ['INT-DATASET-01', 'GET', '/api/v1/scheduling/datasets'],
      ['INT-PLAN-01', 'POST', '/api/v1/scheduling/plans']
    ])
    expect(vm.apis[0].fields).toHaveLength(7)
    expect(vm.apis[1].fields.filter(field => field.required).map(field => field.name)).toEqual(['externalPlanId', 'taskId', 'assignments'])
    expect(vm.apis[1].successStatus).toBe('202')
    expect(vm.envelopeExample).toContain('"code": 0')
  })

  it('copies documentation text without making a network request', async() => {
    const vm = context()
    const writeText = jest.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText }})
    const fetchSpy = jest.fn()
    Object.defineProperty(window, 'fetch', { configurable: true, value: fetchSpy })
    await vm.copyCode('example payload')
    expect(writeText).toHaveBeenCalledWith('example payload')
    expect(vm.$message.success).toHaveBeenCalledWith('代码已复制')
    expect(fetchSpy).not.toHaveBeenCalled()
    delete window.fetch
  })

  it('scrolls the selected documentation section into view', () => {
    const vm = context()
    const scrollIntoView = jest.fn()
    const lookup = jest.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView })
    vm.scrollTo('plans-api')
    expect(lookup).toHaveBeenCalledWith('plans-api')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    lookup.mockRestore()
  })
})
