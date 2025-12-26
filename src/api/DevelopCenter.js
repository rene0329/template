import request from './axiosConfig'

// 上传函数文件
export const UploadFunction = (file) => {
  return request({
    url: '/UploadFunction',
    method: 'post',
    head : {
        'Content-Type': 'multipart/form-data'
    },
    data: file
  })
}

//python语言编译
export const CodeFunction = (param) => {
  return request({
    url: '/CodeFunction',
    method: 'post',
    param
  })
}

//将编译内容保存到指定文件夹下面
export const CodeFunctionUpload = (param) => {
  return request({
    url: '/CodeFunctionUpload',
    method: 'post',
    param
  })
}

//将流程图保存到指定文件夹下面
export const bpmnUpload = (param) => {
  return request({
    url: '/bpmnUpload',
    method: 'post',
    param
  })
}

// 创建函数命令
export const CreateFunction = (data) => {
  return request({
    url: '/CreateFunction',
    method: 'post',
    data
  })
}

// 创建流程图命令
export const CreateFlow = (data) => {
  return request({
    url: '/CreateFlow',
    method: 'post',
    data
  })
}

// 获取代码文件
export const getCodeFile = (data) => {
  return request({
    url: '/getCodeFile',
    method: 'get',
    data
  })
}

// 获取BPMN文件
export const getBPMNFile = (data) => {
  return request({
    url: '/getBPMNFile',
    method: 'get',
    data
  })
}

// 删除BPMN文件
export const deleteBPMNFile = (data) => {
  return request({
    url: '/deleteBPMNFile',
    method: 'post',
    data
  })
}

// 删除FUNC文件
export const deleteFUNCFile = (data) => {
  return request({
    url: '/deleteFUNCFile',
    method: 'post',
    data
  })
}
