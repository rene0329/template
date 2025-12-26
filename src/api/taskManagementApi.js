// src/api/taskManagementApi.js (重命名文件以保持一致性)
import request from './axiosConfig'

// --- 为我们新功能添加的 Task API ---
export const fetchTaskList = (page, pageSize, query = '') => {
  return request({
    url: '/common/taskList', // 路径前缀 '/common' 会被代理处理
    method: 'get',
    params: { page, pageSize, query }
  });
};

export const clearAllTasks = () => {
  return request({
    url: '/common/clearTasks', // 路径前缀 '/common' 会被代理处理
    method: 'delete',
  });
};
