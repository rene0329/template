import request from './axiosConfig'

const ROOT = '/api/v1/security/dataset-access'

// 当前账号对全部数据集的可用性：{ serverTime, ttlMinutes, items: [...] }
export const fetchDatasetAccess = (options = {}) => request({ url: ROOT, method: 'get', ...options })

// 访问申请日志（仅管理员）：{ serverTime, items: [{ grantId, username, datasetName, reason, createdAt, expiresAt, active, ... }] }
export const fetchAccessGrantLog = (limit = 500) => request({ url: `${ROOT}/grants`, method: 'get', params: { limit }})

// 为权限外数据集申请临时访问令牌：{ grantId, datasetId, expiresAt, ttlMinutes }
export const requestDatasetAccessGrant = (datasetId, reason) => request({
  url: `${ROOT}/grants`,
  method: 'post',
  data: { datasetId, reason }
})
