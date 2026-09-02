import request from './axiosConfig'

export const fetchSchedulableDatasets = (params) => request({
  url: '/api/v1/scheduling/datasets',
  method: 'get',
  params
})

// externalPlanId is the backend's idempotency key; retain it when retrying a plan.
export const submitDatasetSchedule = (data) => request({
  url: '/api/v1/scheduling/data-plans',
  method: 'post',
  data
})

export const submitComputeSchedule = (data) => request({
  url: '/api/v1/scheduling/compute-plans',
  method: 'post',
  data
})

export const fetchSchedulingPlans = (params) => request({
  url: '/api/v1/scheduling/plans',
  method: 'get',
  params
})

export const fetchSchedulingPlan = (planId) => request({
  url: `/api/v1/scheduling/plans/${planId}`,
  method: 'get'
})
