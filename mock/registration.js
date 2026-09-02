// Business fixtures are only mounted by the explicit local demo mode.
module.exports = ({ nodes, datasets, tasks, page }) => {
  const ok = data => ({ code: 0, msg: 'ok', data })
  const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
  const taskRequests = new Map()
  const nodeView = node => ({
    nodeId: node.nodeId, k8sNodeName: node.nodeName,
    displayName: node.displayName || node.nodeName, clusterId: node.cluster,
    role: node.type.toUpperCase().replace(/-/g, '_'),
    internalIp: node.internalIp, externalIp: node.externalIp,
    effectiveStatus: node.effectiveStatus, schedulable: node.schedulable,
    statusReason: node.statusReason || null, version: node.version || 0,
    enabled: node.effectiveStatus !== 'DISABLED',
    registrationStatus: node.effectiveStatus === 'INACTIVE' ? 'REGISTERED' : (node.effectiveStatus === 'DISABLED' ? 'DISABLED' : 'ACTIVE'),
    observedStatus: node.effectiveStatus === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
    ...node.metrics, maxMemoryGi: node.metrics.maxMemory, currentMemoryGi: node.metrics.currentMemory
  })
  const datasetViews = () => datasets.map(dataset => {
    // Deliberately use IDs distinct from physical-file dataId to catch accidental mixing.
    const datasetId = 1000 + dataset.dataId
    const owners = nodes.filter(n => n.nodeName === dataset.dataServer || n.nodeName === dataset.backupServer)
    const replicas = owners.map((node, index) => ({
      datasetId, replicaId: datasetId * 10 + index, nodeId: node.nodeId,
      filePath: dataset.filePath, sizeBytes: dataset.dataSize,
      availability: 'AVAILABLE', effectiveAvailability: node.schedulable ? 'USABLE' : 'UNREACHABLE',
      statusReason: node.schedulable ? null : '节点不可用', checksum: null,
      lastSeenAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z'
    }))
    const availableReplicaCount = replicas.filter(r => r.effectiveAvailability === 'USABLE').length
    return {
      datasetId, datasetCode: `demo-${datasetId}`, name: dataset.dataName,
      version: '1.0', description: dataset.dataDescription, dataType: dataset.fileType,
      category: 'OTHER', format: dataset.fileType, status: dataset.dataStatus === 1 ? 'ACTIVE' : 'DISABLED',
      labels: { environment: 'demo' }, requiredResources: { cpu: 1, memoryGi: 1, gpu: 0 },
      defaultRuntimeImageId: 1, replicas, availableReplicaCount, totalReplicaCount: replicas.length,
      healthStatus: availableReplicaCount === 0 ? 'UNAVAILABLE' : (availableReplicaCount < replicas.length ? 'DEGRADED' : 'HEALTHY'),
      statusReason: availableReplicaCount ? null : '没有可用副本', rowVersion: 0
    }
  })
  const preflight = body => {
    if (!Array.isArray(body.datasetIds) || !body.datasetIds.length) fail('datasetIds is required')
    const all = datasetViews()
    const checks = body.datasetIds.map(id => {
      const dataset = all.find(d => d.datasetId === id)
      const available = !!dataset && dataset.status === 'ACTIVE' && dataset.availableReplicaCount > 0
      return { resourceType: 'DATASET', resourceId: String(id), name: dataset && dataset.name,
        available, status: available ? 'AVAILABLE' : 'UNAVAILABLE',
        message: available ? null : '数据集未激活或没有可用副本' }
    })
    return { valid: checks.every(c => c.available), checks }
  }
  return [
    { url: '/api/v1/nodes$', type: 'get', response: req => ok(page(nodes.map(nodeView), req.query.query,
      ['k8sNodeName', 'displayName', 'internalIp'], req.query.page, req.query.pageSize)) },
    { url: '/api/v1/nodes/[0-9]+$', type: 'patch', response: req => {
      const node = nodes.find(n => String(n.nodeId) === req.path.split('/').pop())
      if (!node) fail('node not found', 404)
      if (Object.keys(req.body).some(key => !['displayName', 'version'].includes(key))) fail('unsupported field')
      if (req.body.version !== (node.version || 0)) fail('node version changed', 409)
      node.displayName = req.body.displayName
      node.version = (node.version || 0) + 1
      return ok(nodeView(node))
    } },
    { url: '/api/v1/datasets$', type: 'get', response: req => ok(page(datasetViews(), req.query.query,
      ['name', 'description'], req.query.page, req.query.pageSize)) },
    { url: '/api/v1/tasks/preflight$', type: 'post', response: req => ok(preflight(req.body)) },
    { url: '/api/v1/tasks$', type: 'post', response: (req, res) => {
      const key = req.headers['idempotency-key']
      if (!key) fail('Idempotency-Key is required')
      const signature = JSON.stringify(req.body)
      if (taskRequests.has(key)) {
        const previous = taskRequests.get(key)
        if (previous.signature !== signature) fail('idempotency key reused with different payload', 409)
        if (res) res.status(202)
        return ok(previous.result)
      }
      if (!preflight(req.body).valid) fail('task preflight failed', 409)
      const taskId = Math.max(0, ...tasks.map(t => t.taskId)) + 1
      tasks.push({ taskId, taskName: req.body.taskName, status: '已接收', datasetIds: req.body.datasetIds })
      const result = { taskId, status: 'ACCEPTED' }
      taskRequests.set(key, { signature, result })
      if (res) res.status(202)
      return ok(result)
    } }
  ]
}
