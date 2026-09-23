import request from './axiosConfig'

const ROOT = '/api/v1/security/dataset-access'

// 当前账号对全部数据集的可用性：{ serverTime, ttlMinutes, items: [...] }
export const fetchDatasetAccess = (options = {}) => request({ url: ROOT, method: 'get', ...options })

// 为权限外数据集申请临时访问令牌：{ grantId, datasetId, expiresAt, ttlMinutes }
export const requestDatasetAccessGrant = (datasetId, reason) => request({
  url: `${ROOT}/grants`,
  method: 'post',
  data: { datasetId, reason }
})
