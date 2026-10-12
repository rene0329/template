import request from './axiosConfig'

const ROOT = '/api/v1/admin'

export const fetchDomains = (params = {}) => request({ url: `${ROOT}/domains`, method: 'get', params })
export const createDomain = data => request({ url: `${ROOT}/domains`, method: 'post', data })
export const updateDomain = (id, data) => request({ url: `${ROOT}/domains/${encodeURIComponent(id)}`, method: 'patch', data })

export const fetchUsers = (params = {}) => request({ url: `${ROOT}/users`, method: 'get', params })
export const createUser = data => request({ url: `${ROOT}/users`, method: 'post', data })
export const updateUser = (id, data) => request({ url: `${ROOT}/users/${encodeURIComponent(id)}`, method: 'patch', data })
export const resetUserPassword = (id, password) => request({
  url: `${ROOT}/users/${encodeURIComponent(id)}/reset-password`, method: 'post', data: { password }
})

export const fetchRateLimitConfiguration = () => request({ url: `${ROOT}/rate-limits`, method: 'get' })
export const updateRateLimitConfiguration = data => request({ url: `${ROOT}/rate-limits`, method: 'put', data })
export const fetchRateLimitHistory = (limit = 20) => request({ url: `${ROOT}/rate-limits/history`, method: 'get', params: { limit }})
export const rollbackRateLimitConfiguration = data => request({ url: `${ROOT}/rate-limits/rollback`, method: 'post', data })
