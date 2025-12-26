import request from './axiosConfig'

// 获取工作流信息
export const getWorkFlowInfo = (param) => {
  return request({
    url: '/getWorkFlowSpyInfo',
    method: 'get',
    param
  })
}

// 更新工作流信息
export const updateWorkFlowInfo = (data) => {
  return request({
    url: '/updateWorkFlowSpyInfo',
    method: 'post',
    data
  })
}

// 获取工作流的yaml(stack.yaml)
export const getWorkFlowYamlStack = (data) => {
  return request({
    url: '/getWorkFlowYamlStack',
    method: 'post',
    data
  })
}

// 获取工作流的yaml(flow.yml/Env)
export const getWorkFlowYamlEnv = (data) => {
  return request({
    url: '/getWorkFlowYamlEnv',
    method: 'post',
    data
  })
}

// 获取工作流的logs
export const getWorkFlowLogs = (data) => {
  return request({
    url: '/getWorkFlowLogs',
    method: 'post',
    data
  })
}

// 更新工作流的yaml(stack.yaml)
export const updateWorkFlowYamlStack = (data) => {
  return request({
    url: '/updateWorkFlowYamlStack',
    method: 'post',
    data
  })
}

// 更新工作流的yaml(flow.yml/Env)
export const updateWorkFlowYamlEnv = (data) => {
  return request({
    url: '/updateWorkFlowYamlEnv',
    method: 'post',
    data
  })
}

// 获取工作流的trace_id
export const getWorkFlowTraceId = (data) => {
  return request({
    url: '/getWorkFlowTraceId',
    method: 'post',
    data
  })
}

// 删除工作流
export const deleteWorkFlow = (data) => {
  return request({
    url: '/deleteWorkFlow',
    method: 'post',
    data
  })
}
