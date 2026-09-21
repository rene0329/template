import { validUsername, isExternal } from '@/utils/validate.js'

describe('Utils:validate', () => {
  it('validUsername', () => {
    expect(validUsername('admin')).toBe(true)
    expect(validUsername('owner-a')).toBe(true)
    expect(validUsername('auditor')).toBe(true)
    expect(validUsername('data.owner_01')).toBe(true)
    expect(validUsername('ab')).toBe(false)
    expect(validUsername('invalid user')).toBe(false)
    expect(validUsername('user@domain')).toBe(false)
    expect(validUsername('a'.repeat(65))).toBe(false)
    expect(validUsername(null)).toBe(false)
  })
  it('isExternal', () => {
    expect(isExternal('https://github.com/PanJiaChen/vue-element-admin')).toBe(true)
    expect(isExternal('http://github.com/PanJiaChen/vue-element-admin')).toBe(true)
    expect(isExternal('github.com/PanJiaChen/vue-element-admin')).toBe(false)
    expect(isExternal('/dashboard')).toBe(false)
    expect(isExternal('./dashboard')).toBe(false)
    expect(isExternal('dashboard')).toBe(false)
  })
})
