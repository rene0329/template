import request from './axiosConfig'

// 获取信息
export const getTaskInfo = (param) => {
  return request({
    url: '/getTaskSpyInfo',
    method: 'get',
    param
  })
}


// 提交任务
export const submit_task = (data) => {
  return request({
    url: '/submit_task',
    method: 'post',
    data
  })
}

// 更新任务
export const update_task = (data) => {
  return request({
    url: '/update_task',
    method: 'post',
    data
  })
}

// 更新任务
export const getTaskLogs = (data) => {
  return request({
    url: '/getTaskLogs',
    method: 'post',
    data
  })
}

// 删除任务
export const delete_task = (data) => {
  return request({
    url: '/delete_task',
    method: 'post',
    data
  })
}
