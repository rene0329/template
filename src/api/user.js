import request from './axiosConfig'

export function login(data) {
  return request({
    url: '/api/v1/auth/login',
    method: 'post',
    data,
    skipAuth: true
  })
}

export function getInfo() {
  return request({ url: '/api/v1/auth/me', method: 'get' })
}

export function impersonateUser(userId) {
  return request({ url: '/api/v1/auth/impersonation', method: 'post', data: { userId }})
}

export function exitImpersonation() {
  return request({ url: '/api/v1/auth/impersonation/exit', method: 'post' })
}
