// src/api/dataManagementApi.js
import request from './axiosConfig';

/**
 * 封装与数据管理相关的后端 API 调用。
 */
export const fetchUserDataList = (page, pageSize, query = '') => {
  return request({
    url: '/common/list', // 路径前缀 '/common' 会被代理处理
    method: 'get',
    params: { page, pageSize, query }
  });
};

export const fetchAdminDataList = (page, pageSize, query = '') => {
  return request({
    url: '/common/dataManagement', // 路径前缀 '/common' 会被代理处理
    method: 'get',
    params: { page, pageSize, query }
  });
};

export const updateDataHeatSingle = (dataName) => {
  return request({
    url: '/common/updateOneHeat', // 路径前缀 '/common' 会被代理处理
    method: 'post',
    data: { dataName } // POST 请求体
  });
};

export const updateDataHeatAll = () => {
  return request({
    url: '/common/updateAll', // 路径前缀 '/common' 会被代理处理
    method: 'get',
  });
};

export const saveDataStorageAll = () => { // 对应“热敏存储”和“原位汇聚”
  return request({
    url: '/common/saveAll', // 路径前缀 '/common' 会被代理处理
    method: 'get',
  });
};

export const toggleDataStatus = (dataName) => {
  return request({
    url: '/common/updateDataStatus', // 路径前缀 '/common' 会被代理处理
    method: 'post',
    data: { dataName } // POST 请求体
  });
};

export const submitUserSelectedData = (currentTaskId, selectedDatas) => {
  return request({
    url: `/common/submitData/${currentTaskId}`, // 路径前缀 '/common' 会被代理处理
    method: 'post',
    data: selectedDatas // 后端接收 List<String> 作为 RequestBody
  });
};
