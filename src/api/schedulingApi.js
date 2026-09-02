import request from './axiosConfig'

export const fetchSchedulingPlans = (params) => request({
  url: '/api/v1/scheduling/plans',
  method: 'get',
  params
})

export const fetchSchedulingPlan = (planId) => request({
  url: `/api/v1/scheduling/plans/${planId}`,
  method: 'get'
})
