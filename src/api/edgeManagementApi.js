// src/api/edgeManagementApi.js
import request from './axiosConfig';

/**
 * 封装与网络链路管理相关的后端 API 调用。
 */
export const fetchNetworkEdges = () => {
  return request({
    url: '/common/links', // 路径前缀 '/common' 会被代理处理
    method: 'get',
  });
};

// 如果 DataExplorerService 暴露了 GET /api/network/allMetrics 接口
export const fetchNetworkMetrics = () => {
  return request({
    url: '/api/network/allMetrics', // 路径前缀 '/api' 会被代理处理
    method: 'get',
  });
};
