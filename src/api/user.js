// Transitional template entry only. This is NOT authentication/authorization.
// Keep it independent of business HTTP and never patch XMLHttpRequest in production.
const users = {
  admin: { name: '模板管理员', roles: ['admin'] },
  editor: { name: '模板用户', roles: ['editor'] }
}

export function login(data) {
  if (!Object.prototype.hasOwnProperty.call(users, data.username)) return Promise.reject(new Error('模板账户不存在'))
  return Promise.resolve({ code: 20000, data: { token: `${data.username}-token` }})
}

export function getInfo(token) {
  const username = String(token).replace(/-token$/, '')
  if (!Object.prototype.hasOwnProperty.call(users, username) || token !== `${username}-token`) return Promise.reject(new Error('请重新进入模板入口'))
  return Promise.resolve({ code: 20000, data: { ...users[username], avatar: '', introduction: '模板入口，非真实鉴权' }})
}

export function logout() {
  return Promise.resolve({ code: 20000, data: 'success' })
}
