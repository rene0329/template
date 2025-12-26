import request from './axiosConfig'


// 获取信息
export const getModelInfo = (param) => {
  return request({
    url: '/getModelSpyInfo',
    method: 'get',
    param
  })
}

// 创建模型
export const submit_model = (param) => {
  return request({
    url: '/submit_model',
    method: 'post',
    param
  })
}


// 上传文件
export const uploadParmFile = (param) => {
  return request({
    url: '/uploadParmFile',
    method: 'post',
    head : {
        'Content-Type': 'multipart/form-data'
    },
    param
  })
}


// 更新模型
export const update_model = (data) => {
  return request({
    url: '/update_model',
    method: 'post',
    data
  })
}

// 删除模型
export const delete_model = (data) => {
  return request({
    url: '/delete_model',
    method: 'post',
    data
  })
}
