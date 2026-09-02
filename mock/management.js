const nodes = [
  {
    nodeId: 101,
    nodeName: 'kuching-master-01',
    internalIp: '10.42.0.11',
    externalIp: '172.18.12.11',
    type: 'master',
    cluster: '砂拉越中心集群',
    effectiveStatus: 'AVAILABLE',
    registrationStatus: 'REGISTERED',
    observedStatus: 'READY',
    schedulable: true,
    x: 160,
    y: 160,
    cpu: 34,
    disk: 46,
    metrics: { currentCpu: 22, maxCpu: 64, currentMemory: 88, maxMemory: 256 }
  },
  {
    nodeId: 102,
    nodeName: 'kuching-compute-01',
    internalIp: '10.42.0.21',
    externalIp: '172.18.12.21',
    type: 'compute',
    cluster: '砂拉越中心集群',
    effectiveStatus: 'AVAILABLE',
    registrationStatus: 'REGISTERED',
    observedStatus: 'READY',
    schedulable: true,
    x: 390,
    y: 80,
    cpu: 62,
    disk: 58,
    metrics: { currentCpu: 79, maxCpu: 128, currentMemory: 303, maxMemory: 512 }
  },
  {
    nodeId: 103,
    nodeName: 'kuching-storage-01',
    internalIp: '10.42.0.31',
    externalIp: '172.18.12.31',
    type: 'storage',
    cluster: '砂拉越中心集群',
    effectiveStatus: 'AVAILABLE',
    registrationStatus: 'REGISTERED',
    observedStatus: 'READY',
    schedulable: true,
    x: 390,
    y: 240,
    cpu: 21,
    disk: 71,
    metrics: { currentCpu: 14, maxCpu: 64, currentMemory: 171, maxMemory: 256 }
  },
  {
    nodeId: 104,
    nodeName: 'sibu-edge-01',
    internalIp: '10.42.1.21',
    externalIp: '172.18.24.21',
    type: 'compute-storage',
    cluster: '诗巫边缘集群',
    effectiveStatus: 'AVAILABLE',
    registrationStatus: 'REGISTERED',
    observedStatus: 'READY',
    schedulable: true,
    x: 650,
    y: 80,
    cpu: 48,
    disk: 63,
    metrics: { currentCpu: 31, maxCpu: 64, currentMemory: 119, maxMemory: 256 }
  },
  {
    nodeId: 105,
    nodeName: 'miri-edge-01',
    internalIp: '10.42.2.21',
    externalIp: '172.18.36.21',
    type: 'compute-storage',
    cluster: '美里边缘集群',
    effectiveStatus: 'AVAILABLE',
    registrationStatus: 'REGISTERED',
    observedStatus: 'READY',
    schedulable: true,
    x: 650,
    y: 240,
    cpu: 55,
    disk: 37,
    metrics: { currentCpu: 35, maxCpu: 64, currentMemory: 94, maxMemory: 256 }
  },
  {
    nodeId: 106,
    nodeName: 'bintulu-worker-01',
    internalIp: '10.42.3.21',
    externalIp: '172.18.48.21',
    type: 'worker',
    cluster: '民都鲁边缘集群',
    effectiveStatus: 'INACTIVE',
    registrationStatus: 'REGISTERED',
    observedStatus: 'NOT_READY',
    schedulable: false,
    statusReason: '节点维护中',
    x: 890,
    y: 80,
    cpu: 0,
    disk: 44,
    metrics: { currentCpu: 0, maxCpu: 32, currentMemory: 0, maxMemory: 128 }
  },
  {
    nodeId: 107,
    nodeName: 'backup-storage-01',
    internalIp: '10.42.0.41',
    externalIp: '172.18.12.41',
    type: 'storage',
    cluster: '砂拉越中心集群',
    effectiveStatus: 'DISABLED',
    registrationStatus: 'DISABLED',
    observedStatus: 'READY',
    schedulable: false,
    statusReason: '管理员已停用',
    x: 890,
    y: 240,
    cpu: 8,
    disk: 29,
    metrics: { currentCpu: 5, maxCpu: 64, currentMemory: 42, maxMemory: 256 }
  }
]

const datasets = [
  {
    dataId: 2001,
    dataName: 'sarawak-rainfall-2026',
    dataDescription: '砂拉越 2026 年逐小时降雨与气象观测数据',
    dataSize: 284 * 1024 * 1024,
    dataHeat: 96,
    dataStatus: 1,
    dataNodeId: 104,
    dataServer: 'sibu-edge-01',
    backupServer: 'kuching-storage-01',
    fileType: 'Parquet',
    filePath: '/datasets/weather/sarawak-rainfall-2026.parquet'
  },
  {
    dataId: 2002,
    dataName: 'satellite-borneo-l2',
    dataDescription: '婆罗洲区域遥感卫星二级产品',
    dataSize: 860 * 1024 * 1024,
    dataHeat: 91,
    dataStatus: 1,
    dataNodeId: 105,
    dataServer: 'miri-edge-01',
    backupServer: 'kuching-storage-01',
    fileType: 'GeoTIFF',
    filePath: '/datasets/remote-sensing/satellite-borneo-l2'
  },
  {
    dataId: 2003,
    dataName: 'river-level-realtime',
    dataDescription: '主要河流水位站实时采集数据',
    dataSize: 96 * 1024 * 1024,
    dataHeat: 88,
    dataStatus: 1,
    dataNodeId: 104,
    dataServer: 'sibu-edge-01',
    backupServer: 'miri-edge-01',
    fileType: 'JSON',
    filePath: '/datasets/iot/river-level-realtime.json'
  },
  {
    dataId: 2004,
    dataName: 'traffic-camera-snapshots',
    dataDescription: '重点道路摄像头抽帧图像数据',
    dataSize: 1536 * 1024 * 1024,
    dataHeat: 82,
    dataStatus: 1,
    dataNodeId: 102,
    dataServer: 'kuching-compute-01',
    backupServer: 'kuching-storage-01',
    fileType: 'JPEG',
    filePath: '/datasets/traffic/camera-snapshots'
  },
  {
    dataId: 2005,
    dataName: 'power-grid-load',
    dataDescription: '区域电网负载与用电趋势数据',
    dataSize: 428 * 1024 * 1024,
    dataHeat: 76,
    dataStatus: 1,
    dataNodeId: 103,
    dataServer: 'kuching-storage-01',
    backupServer: 'miri-edge-01',
    fileType: 'CSV',
    filePath: '/datasets/energy/power-grid-load.csv'
  },
  {
    dataId: 2006,
    dataName: 'forest-fire-risk',
    dataDescription: '森林火险等级和历史告警样本',
    dataSize: 312 * 1024 * 1024,
    dataHeat: 69,
    dataStatus: 1,
    dataNodeId: 105,
    dataServer: 'miri-edge-01',
    backupServer: 'kuching-storage-01',
    fileType: 'Parquet',
    filePath: '/datasets/environment/forest-fire-risk.parquet'
  },
  {
    dataId: 2007,
    dataName: 'port-cargo-manifest',
    dataDescription: '港口货运清单脱敏分析数据',
    dataSize: 205 * 1024 * 1024,
    dataHeat: 61,
    dataStatus: 1,
    dataNodeId: 103,
    dataServer: 'kuching-storage-01',
    backupServer: 'sibu-edge-01',
    fileType: 'CSV',
    filePath: '/datasets/logistics/port-cargo-manifest.csv'
  },
  {
    dataId: 2008,
    dataName: 'legacy-climate-archive',
    dataDescription: '历史气候归档数据，当前暂停参与调度',
    dataSize: 740 * 1024 * 1024,
    dataHeat: 28,
    dataStatus: 0,
    dataNodeId: 107,
    dataServer: 'backup-storage-01',
    backupServer: 'kuching-storage-01',
    fileType: 'NetCDF',
    filePath: '/datasets/archive/legacy-climate.nc'
  },
  {
    dataId: 2009,
    dataName: 'crop-yield-samples',
    dataDescription: '农作物产量预测训练样本',
    dataSize: 178 * 1024 * 1024,
    dataHeat: 55,
    dataStatus: 1,
    dataNodeId: 104,
    dataServer: 'sibu-edge-01',
    backupServer: 'kuching-storage-01',
    fileType: 'CSV',
    filePath: '/datasets/agriculture/crop-yield-samples.csv'
  },
  {
    dataId: 2010,
    dataName: 'coastal-tide-series',
    dataDescription: '沿海潮汐监测时间序列',
    dataSize: 142 * 1024 * 1024,
    dataHeat: 47,
    dataStatus: 1,
    dataNodeId: 105,
    dataServer: 'miri-edge-01',
    backupServer: 'kuching-storage-01',
    fileType: 'Parquet',
    filePath: '/datasets/ocean/coastal-tide-series.parquet'
  }
]

const tasks = [
  { taskId: 6, selectedData: 'sarawak-rainfall-2026、river-level-realtime', createTime: '2026-09-02 15:42:18', status: '执行中' },
  { taskId: 5, selectedData: 'traffic-camera-snapshots', createTime: '2026-09-02 14:27:05', status: '已完成' },
  { taskId: 4, selectedData: 'satellite-borneo-l2、forest-fire-risk', createTime: '2026-09-02 13:08:42', status: '已完成' },
  { taskId: 3, selectedData: 'power-grid-load', createTime: '2026-09-02 11:51:36', status: '排队中' },
  { taskId: 2, selectedData: 'port-cargo-manifest', createTime: '2026-09-01 18:20:11', status: '已完成' },
  { taskId: 1, selectedData: 'crop-yield-samples、coastal-tide-series', createTime: '2026-09-01 16:03:29', status: '已完成' }
]

const schedules = [
  { taskId: 6, schedule: '数据就近汇聚：sibu-edge-01\n计算节点：kuching-compute-01\n预计传输：380 MB', createTime: '2026-09-02 15:42:21' },
  { taskId: 5, schedule: '原位计算：kuching-compute-01\n无需跨节点迁移\n预计耗时：8 分 20 秒', createTime: '2026-09-02 14:27:08' },
  { taskId: 4, schedule: '边缘协同：miri-edge-01 → kuching-compute-01\n带宽预留：800 Mbps\n预计传输：1.17 GB', createTime: '2026-09-02 13:08:45' },
  { taskId: 3, schedule: '等待计算资源：kuching-compute-01\n调度优先级：普通', createTime: '2026-09-02 11:51:39' },
  { taskId: 2, schedule: '存储内计算：kuching-storage-01\n结果写回：sibu-edge-01', createTime: '2026-09-01 18:20:15' },
  { taskId: 1, schedule: '并行计算：sibu-edge-01 / miri-edge-01\n结果汇聚：kuching-master-01', createTime: '2026-09-01 16:03:33' }
]

const analyses = [
  { taskId: 5, t2: 13.84, t1: 4.21, rating: 3.29 },
  { taskId: 4, t2: 31.42, t1: 8.76, rating: 3.59 },
  { taskId: 2, t2: 18.65, t1: 5.92, rating: 3.15 },
  { taskId: 1, t2: 24.18, t1: 6.43, rating: 3.76 }
]

const edges = [
  { id: 'link-01', source: 'kuching-master-01', target: 'kuching-compute-01', latency: 2.4, bandwidth: 1000, active: true },
  { id: 'link-02', source: 'kuching-master-01', target: 'kuching-storage-01', latency: 1.8, bandwidth: 1000, active: true },
  { id: 'link-03', source: 'kuching-compute-01', target: 'sibu-edge-01', latency: 18.6, bandwidth: 800, active: true },
  { id: 'link-04', source: 'kuching-storage-01', target: 'miri-edge-01', latency: 27.3, bandwidth: 600, active: true },
  { id: 'link-05', source: 'sibu-edge-01', target: 'miri-edge-01', latency: 34.1, bandwidth: 400, active: true },
  { id: 'link-06', source: 'kuching-compute-01', target: 'bintulu-worker-01', latency: 31.8, bandwidth: 300, active: false },
  { id: 'link-07', source: 'kuching-storage-01', target: 'backup-storage-01', latency: 3.1, bandwidth: 1000, active: false }
]

function ok(data) {
  return { code: 0, msg: 'success', data }
}

function page(items, query, fields, pageNumber, pageSize) {
  const keyword = String(query || '').trim().toLowerCase()
  const filtered = keyword
    ? items.filter(item => fields.some(field => String(item[field] || '').toLowerCase().includes(keyword)))
    : items
  const currentPage = pageNumber == null ? 1 : Number(pageNumber)
  const size = pageSize == null ? 8 : Number(pageSize)
  if (!Number.isInteger(currentPage) || currentPage < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw Object.assign(new Error('page must be >= 1; pageSize must be between 1 and 100'), { status: 400 })
  }
  const start = (currentPage - 1) * size
  return {
    list: filtered.slice(start, start + size),
    total: filtered.length,
    pageNum: currentPage,
    pageSize: size
  }
}

function timestamp() {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function topologyNode(node) {
  return {
    id: node.nodeName,
    label: node.nodeName,
    nodeId: node.nodeId,
    nodeName: node.nodeName,
    x: node.x,
    y: node.y,
    width: 150,
    height: 62,
    cpu: node.cpu,
    disk: node.disk,
    effectiveStatus: node.effectiveStatus,
    enabled: node.effectiveStatus !== 'DISABLED',
    registrationStatus: node.effectiveStatus === 'AVAILABLE' ? 'ACTIVE' : node.registrationStatus,
    observedStatus: node.observedStatus === 'READY' ? 'ONLINE' : node.observedStatus,
    schedulable: node.schedulable,
    statusReason: node.statusReason || ''
  }
}

module.exports = [
  ...require('./registration')({ nodes, datasets, tasks, page }),
  {
    url: '/common/nodeSettings',
    type: 'get',
    response: req => ok(page(nodes, req.query.query, ['nodeName', 'internalIp', 'cluster'], req.query.page, req.query.pageSize))
  },
  {
    url: '/common/updateNodeSettings',
    type: 'post',
    response: req => {
      throw Object.assign(new Error('use PATCH /api/v1/nodes/{nodeId}'), { status: 410 })
    }
  },
  {
    url: '/common/nodeMetrics/.*',
    type: 'get',
    response: req => {
      const nodeId = req.path.split('/').pop()
      const node = nodes.find(item => String(item.nodeId) === String(nodeId))
      return ok(node ? node.metrics : { currentCpu: 0, maxCpu: 1, currentMemory: 0, maxMemory: 1 })
    }
  },
  {
    url: '/common/networkTopology',
    type: 'get',
    response: req => {
      const activeOnly = String(req.query.activeOnly) === 'true'
      const visibleNodes = activeOnly ? nodes.filter(node => node.effectiveStatus === 'AVAILABLE') : nodes
      const ids = new Set(visibleNodes.map(node => node.nodeName))
      return ok({
        nodes: visibleNodes.map(topologyNode),
        edges: edges.filter(edge => ids.has(edge.source) && ids.has(edge.target) && (!activeOnly || edge.active))
      })
    }
  },
  {
    url: '/common/dataManagement',
    type: 'get',
    response: req => ok(page(datasets, req.query.query, ['dataName', 'dataDescription', 'dataServer'], req.query.page, req.query.pageSize))
  },
  {
    url: '/common/datasetList',
    type: 'get',
    response: req => ok(page(datasets.filter(item => item.dataStatus === 1), req.query.query, ['dataName', 'dataDescription'], req.query.page, req.query.pageSize))
  },
  {
    url: '/common/updateDataItem',
    type: 'post',
    response: req => {
      const index = datasets.findIndex(item => String(item.dataId) === String(req.body.dataId))
      const heat = req.body.dataHeat
      if (Object.keys(req.body).some(key => !['dataId', 'dataHeat'].includes(key)) ||
          typeof heat !== 'number' || !Number.isFinite(heat) || heat < 0 || heat > 100) {
        throw Object.assign(new Error('only dataId and dataHeat (0–100) are supported'), { status: 400 })
      }
      if (index < 0) throw Object.assign(new Error('physical dataset not found'), { status: 404 })
      datasets[index].dataHeat = heat
      return ok(datasets[index])
    }
  },
  {
    url: '/common/updateDataStatus',
    type: 'post',
    response: req => {
      const item = datasets.find(dataset => dataset.dataName === req.body.dataName)
      if (item) item.dataStatus = item.dataStatus === 1 ? 0 : 1
      return ok(item || {})
    }
  },
  {
    url: '/common/updateOneHeat',
    type: 'post',
    response: req => {
      const item = datasets.find(dataset => dataset.dataName === req.body.dataName)
      if (item) item.dataHeat = Math.min(100, item.dataHeat + 3)
      return ok(item || {})
    }
  },
  {
    url: '/common/updateAll',
    type: 'get',
    response: () => {
      datasets.forEach((item, index) => {
        item.dataHeat = Math.max(20, Math.min(99, item.dataHeat + (index % 3) - 1))
      })
      return ok({ updated: datasets.length })
    }
  },
  {
    url: '/common/saveAll',
    type: 'post',
    response: req => {
      if (req.query.mode === 'aggregation') {
        datasets.filter(item => item.dataStatus === 1 && item.dataHeat >= 80).forEach(item => {
          item.backupServer = item.dataServer
          item.dataServer = 'kuching-compute-01'
          item.dataNodeId = 102
        })
      } else {
        datasets.filter(item => item.dataStatus === 1).forEach(item => {
          if (item.dataHeat >= 80) {
            item.dataServer = 'sibu-edge-01'
            item.dataNodeId = 104
          } else {
            item.dataServer = 'kuching-storage-01'
            item.dataNodeId = 103
          }
        })
      }
      return ok({ mode: req.query.mode || 'heat', updated: datasets.length })
    }
  },
  {
    url: '/common/taskList',
    type: 'get',
    response: req => ok(page(tasks, req.query.query, ['taskId', 'selectedData', 'status'], req.query.page, req.query.pageSize))
  },
  {
    url: '/common/updateTask',
    type: 'post',
    response: req => {
      const index = tasks.findIndex(task => String(task.taskId) === String(req.body.taskId))
      if (index >= 0) tasks.splice(index, 1, { ...tasks[index], ...req.body })
      return ok(index >= 0 ? tasks[index] : req.body)
    }
  },
  {
    url: '/common/deleteTask',
    type: 'post',
    response: req => {
      const index = tasks.findIndex(task => String(task.taskId) === String(req.body.taskId))
      const deleted = index >= 0 ? tasks.splice(index, 1)[0] : null
      return ok(deleted || {})
    }
  },
  {
    url: '/common/submitData/.*',
    type: 'post',
    response: req => {
      const rawId = req.path.split('/').pop()
      const taskId = `TASK-DEMO-${rawId}`
      const selectedData = Array.isArray(req.body) ? req.body.join('、') : String(req.body || '')
      const createTime = timestamp()
      const task = { taskId, selectedData, createTime, status: '执行中' }
      tasks.unshift(task)
      schedules.unshift({
        taskId,
        schedule: `智能就近调度\n输入数据：${selectedData}\n计算节点：kuching-compute-01`,
        createTime
      })
      return ok(task)
    }
  },
  {
    url: '/common/submitDatasets',
    type: 'post',
    response: req => ok({ datasetIds: req.body.datasetIds || [] })
  },
  {
    url: '/common/scheduleList',
    type: 'get',
    response: req => ok(page(schedules, req.query.query, ['taskId', 'schedule'], req.query.page, req.query.pageSize))
  },
  {
    url: '/common/analysisData',
    type: 'get',
    response: req => ok(page(analyses, req.query.query, ['taskId'], req.query.page, req.query.pageSize))
  }
]
