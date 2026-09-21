import { login, getInfo, impersonateUser, exitImpersonation } from '@/api/user'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { resetRouter } from '@/router'

const getDefaultState = () => {
  return {
    token: getToken(),
    userId: null,
    username: '',
    name: '',
    avatar: '',
    roles: [],
    domain: null,
    impersonated: false,
    actorUserId: null,
    actorUsername: ''
  }
}

const state = getDefaultState()

const mutations = {
  RESET_STATE: (state) => {
    Object.assign(state, getDefaultState())
  },
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_NAME: (state, name) => {
    state.name = name
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar
  },
  SET_PROFILE: (state, profile) => {
    state.userId = profile.userId
    state.username = profile.username
    state.name = profile.name
    state.avatar = profile.avatar
    state.roles = profile.roles
    state.domain = profile.domain
    state.impersonated = profile.impersonated
    state.actorUserId = profile.actorUserId
    state.actorUsername = profile.actorUsername
  }
}

const actions = {
  // user login
  login({ commit }, userInfo) {
    const { username, password } = userInfo
    return new Promise((resolve, reject) => {
      login({ username: username.trim(), password: password }).then(response => {
        const token = response && (response.token || response.accessToken)
        if (!token) return reject(new Error('登录响应中缺少访问令牌'))
        commit('SET_TOKEN', token)
        setToken(token)
        resolve(response)
      }).catch(error => {
        reject(error)
      })
    })
  },

  // get user info
  getInfo({ commit }) {
    return new Promise((resolve, reject) => {
      getInfo().then(data => {
        if (!data) {
          return reject(new Error('无法读取当前用户信息'))
        }
        const roles = Array.isArray(data.roles) ? data.roles.map(role => typeof role === 'string' ? role : role.code) : []
        const domain = data.domain || (data.domainId ? { id: data.domainId, name: data.domainName || data.domainId } : null)
        commit('SET_PROFILE', {
          userId: data.id || data.userId,
          username: data.username || '',
          name: data.displayName || data.name || data.username || '',
          avatar: data.avatar || '',
          roles,
          domain,
          impersonated: Boolean(data.impersonated),
          actorUserId: data.actorUserId || null,
          actorUsername: data.actorUsername || ''
        })
        resolve(data)
      }).catch(error => {
        reject(error)
      })
    })
  },

  switchUser({ commit, dispatch }, userId) {
    return impersonateUser(userId).then(response => {
      const token = response && (response.token || response.accessToken)
      if (!token) throw new Error('切换用户响应中缺少访问令牌')
      commit('SET_TOKEN', token)
      setToken(token)
      resetRouter()
      return dispatch('getInfo')
    })
  },

  exitUserSwitch({ commit, dispatch }) {
    return exitImpersonation().then(response => {
      const token = response && (response.token || response.accessToken)
      if (!token) throw new Error('返回管理员响应中缺少访问令牌')
      commit('SET_TOKEN', token)
      setToken(token)
      resetRouter()
      return dispatch('getInfo')
    })
  },

  // user logout
  logout({ commit }) {
    return new Promise(resolve => {
      removeToken()
      resetRouter()
      commit('RESET_STATE')
      resolve()
    })
  },

  // remove token
  resetToken({ commit }) {
    return new Promise(resolve => {
      removeToken() // must remove  token  first
      commit('RESET_STATE')
      resolve()
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
