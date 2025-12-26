// src/api/nodeManagementApi.js
import request from './axiosConfig';

/**
 * 封装与节点管理相关的后端 API 调用。
 */
export const fetchNetworkConfigurationNodes = (page, pageSize, query = '') => {
  return request({
    url: '/common/networkConfiguration', // 路径前缀 '/common' 会被代理处理
    method: 'get',
    params: { page, pageSize, query }
  });
};

export const fetchNetworkConstructionNodes = () => {
  return request({
    url: '/common/networkConstruction', // 路径前缀 '/common' 会被代理处理
    method: 'get',
  });
};

export const fetchNodeDashboardData = (nodeName) => {
  return request({
    url: '/common/yiBiaoPan', // 路径前缀 '/common' 会被代理处理
    method: 'put', // 对应后端 CommonController 的 @PutMapping("/yiBiaoPan")
    data: { nodeName } // PUT 请求体
  });
};
