// src/api/managementCenterApi.js
// ManagementCenter 模块统一 API
import request from './axiosConfig'

// ==================== 数据管理 (DataManagement) ====================
/**
 * 获取数据管理列表
 */
export const fetchDataManagementList = (page, pageSize, query = '') => {
  return request({
    url: '/common/dataManagement',
    method: 'get',
    params: { page, pageSize, query }
  })
}

/**
 * 更新单个数据热度
 */
export const updateDataHeatSingle = (dataName) => {
  return request({
    url: '/common/updateOneHeat',
    method: 'post',
    data: { dataName }
  })
}

/**
 * 热度全部更新
 */
export const updateDataHeatAll = () => {
  return request({
    url: '/common/updateAll',
    method: 'get'
  })
}

/**
 * 热敏存储 / 原位汇聚
 */
export const saveDataStorageAll = () => {
  return request({
    url: '/common/saveAll',
    method: 'get'
  })
}

/**
 * 禁用/启用数据项状态
 */
export const toggleDataStatus = (dataName) => {
  return request({
    url: '/common/updateDataStatus',
    method: 'post',
    data: { dataName }
  })
}

/**
 * 更新数据项
 */
export const updateDataItem = (data) => {
  return request({
    url: '/common/updateDataItem',
    method: 'post',
    data
  })
}

// ==================== 任务列表 (TaskList) ====================
/**
 * 获取任务列表
 */
export const fetchTaskList = (page, pageSize, query = '') => {
  return request({
    url: '/common/taskList',
    method: 'get',
    params: { page, pageSize, query }
  })
}

/**
 * 更新任务
 */
export const updateTask = (task) => {
  return request({
    url: '/common/updateTask',
    method: 'post',
    data: task
  })
}

/**
 * 删除任务
 */
export const deleteTask = (task) => {
  return request({
    url: '/common/deleteTask',
    method: 'post',
    data: task
  })
}

// ==================== 数据选择 (SelectData) ====================
/**
 * 获取可选数据集列表
 */
export const fetchDatasetList = (page, pageSize, query = '') => {
  return request({
    url: '/common/datasetList',
    method: 'get',
    params: { page, pageSize, query }
  })
}

/**
 * 提交选中的数据集
 */
export const submitSelectedDatasets = (datasetIds) => {
  return request({
    url: '/common/submitDatasets',
    method: 'post',
    data: { datasetIds }
  })
}

// ==================== 调度展示 (Schedule) ====================
/**
 * 获取调度计划列表
 */
export const fetchScheduleList = (page, pageSize, query = '') => {
  return request({
    url: '/common/scheduleList',
    method: 'get',
    params: { page, pageSize, query }
  })
}

// ==================== 网络拓扑 (FrameNet) ====================
/**
 * 获取完整网络拓扑数据（节点+边）
 */
export const fetchNetworkTopology = () => {
  return request({
    url: '/common/networkTopology',
    method: 'get'
  })
}

// ==================== 性能分析 (Analyze) ====================
/**
 * 获取性能分析数据
 */
export const fetchAnalysisData = (page, pageSize, query = '') => {
  return request({
    url: '/common/analysisData',
    method: 'get',
    params: { page, pageSize, query }
  })
}

// ==================== 网络配置/节点设置 (Settings) ====================
/**
 * 获取节点配置列表
 */
export const fetchNodeSettings = (page, pageSize, query = '') => {
  return request({
    url: '/common/nodeSettings',
    method: 'get',
    params: { page, pageSize, query }
  })
}

/**
 * 更新节点配置
 */
export const updateNodeSettings = (node) => {
  return request({
    url: '/common/updateNodeSettings',
    method: 'post',
    data: node
  })
}

/**
 * 获取节点资源使用情况（CPU、内存、存储）
 */
export const fetchNodeMetrics = (nodeId) => {
  return request({
    url: `/common/nodeMetrics/${nodeId}`,
    method: 'get'
  })
}
