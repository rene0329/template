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

export const assignDatasetOwner = (datasetId, userId) => request({
  url: `${ROOT}/datasets/${encodeURIComponent(datasetId)}/owner`,
  method: 'put',
  data: { userId }
})
