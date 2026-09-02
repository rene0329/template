<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div v-loading="loading" class="content-card">
        <div class="kiali-topo">
          <div class="toolbar">
            <el-button size="small" @click="fit">自适应</el-button>
            <el-switch v-model="activeOnly" active-text="只看可用节点" @change="refreshTopology" />
            <span class="legend">
              <i class="dot available" />可用
              <i class="dot inactive" />未启用
              <i class="dot offline" />异常/离线
            </span>
            <span class="refresh-time" title="最近更新时间">
              <i class="el-icon-time" />{{ lastUpdatedAt || '--:--:--' }}
            </span>
          </div>

          <div
            class="svg-container"
            @wheel.prevent="handleWheel"
            @mousedown="startDrag"
            @mousemove="handleMouseMove"
            @mouseup="stopDrag"
            @mouseleave="stopDrag"
          >
            <svg ref="svg" :width="svgWidth" :height="svgHeight">
              <g :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`">
                <!-- 集群 -->
                <g v-for="c in clusters" :key="c.id">
                  <rect
                    :x="c.bounds.x"
                    :y="c.bounds.y"
                    :width="c.bounds.width"
                    :height="c.bounds.height"
                    fill="transparent"
                    stroke="#aaa"
                    stroke-width="2"
                    stroke-dasharray="5,3"
                    rx="6"
                  />
                  <text
                    :x="c.center.x"
                    :y="c.bounds.y - 15"
                    font-size="15"
                    font-weight="bold"
                    fill="#555"
                    text-anchor="middle"
                  >{{ c.label }}</text>
                </g>

                <!-- 箭头 -->
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#666" />
                  </marker>
                </defs>

                <!-- 链路 -->
                <g v-for="e in edges" :key="e.id">
                  <path
                    :d="getEdgePath(e)"
                    :stroke="getEdgeColor(e.latency)"
                    :stroke-width="getEdgeWidth(e.bandwidth)"
                    :stroke-dasharray="e.active === false ? '7,5' : ''"
                    fill="none"
                    stroke-linecap="round"
                    style="cursor: pointer; pointer-events: stroke;"
                    @mouseover="showTip('edge', e, $event)"
                    @mouseout="hideTip"
                  />
                </g>

                <!-- 节点 -->
                <g v-for="n in nodes" :key="n.id" class="topology-node" @click.stop="selectNode(n)">
                  <rect
                    :x="n.x - n.width/2"
                    :y="n.y - n.height/2"
                    :width="n.width"
                    :height="n.height"
                    rx="8"
                    :fill="getNodeFill(n)"
                    :stroke="getNodeColor(n)"
                    :stroke-width="selectedNodeId === n.id ? 4 : 2"
                    style="cursor: pointer;"
                    @mouseover="showTip('node', n, $event)"
                    @mouseout="hideTip"
                  />
                  <g
                    class="server-icon"
                    :transform="`translate(${n.x - 9}, ${n.y - 28})`"
                    aria-hidden="true"
                  >
                    <rect x="0" y="0" width="18" height="7" rx="2" />
                    <circle cx="3.5" cy="3.5" r="1" />
                    <line x1="7" y1="3.5" x2="14.5" y2="3.5" />
                    <rect x="0" y="9" width="18" height="7" rx="2" />
                    <circle cx="3.5" cy="12.5" r="1" />
                    <line x1="7" y1="12.5" x2="14.5" y2="12.5" />
                  </g>
                  <text
                    :x="n.x"
                    :y="n.y + 3"
                    font-size="12"
                    fill="#333"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    style="pointer-events:none"
                  >{{ n.label }}</text>
                  <text
                    :x="n.x"
                    :y="n.y + 21"
                    font-size="10"
                    fill="#606266"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    style="pointer-events:none"
                  >{{ n.datasets.length }} 个数据集</text>
                </g>
              </g>
            </svg>
          </div>

          <!-- 悬浮提示 -->
          <div v-if="tip.visible" class="tooltip" :style="tip.style" v-html="tip.html" />
        </div>

        <section class="dataset-panel">
          <el-alert v-if="datasetError" :title="datasetError" type="warning" :closable="false" />
          <el-alert v-if="topologyError" :title="topologyError" type="warning" :closable="false" />
          <div class="dataset-panel__header">
            <div>
              <strong>节点数据集</strong>
              <el-tag v-if="selectedNode" size="mini" type="info">{{ selectedNode.label }}</el-tag>
              <span class="dataset-count">{{ selectedNodeDatasets.length }} 个数据集 / {{ selectedNodeDatasets.reduce((n, d) => n + d.replicaCount, 0) }} 个副本</span>
            </div>
            <span class="dataset-hint">点击拓扑节点切换查看</span>
          </div>
          <el-table
            :data="selectedNodeDatasets"
            size="mini"
            max-height="190"
            empty-text="该节点暂无数据集"
          >
            <el-table-column prop="dataName" label="数据集名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="fileType" label="类型" width="100" align="center">
              <template slot-scope="scope">{{ scope.row.fileType || '-' }}</template>
            </el-table-column>
            <el-table-column label="大小" width="120" align="right">
              <template slot-scope="scope">{{ formatBytes(scope.row.dataSize) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template slot-scope="scope">
                <el-tag size="mini" :type="scope.row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="90" align="center" />
            <el-table-column prop="replicaStatus" label="本节点副本状态" min-width="170" show-overflow-tooltip />
            <el-table-column prop="filePath" label="文件路径" min-width="260" show-overflow-tooltip />
          </el-table>
        </section>
      </div>
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import { fetchNetworkTopology } from '@/api/managementCenterApi'
import { fetchRegisteredDatasets } from '@/api/registrationApi'
import { fetchAllPages, datasetsForNode, formatBytes } from '@/utils/dataset-catalog'
import { keepStableCollection } from '@/utils/live-refresh'

export default {
  name: 'FrameNet',
  data() {
    return {
      svgWidth: 0,
      svgHeight: 0,
      scale: 1,
      pan: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      panStart: { x: 0, y: 0 },
      loading: false,
      refreshing: false,
      requestVersion: 0,
      datasetError: '',
      topologyError: '',
      datasets: [],
      datasetTimer: null,
      datasetsLoading: false,
      refreshTimer: null,
      lastUpdatedAt: '',
      selectedNodeId: '',
      activeOnly: false,
      clusters: [],
      // 从服务器获取的数据
      topologyNodes: [],
      edges: [],
      tip: { visible: false, html: '', style: {}},
      mousePos: { x: 0, y: 0 },
      systemName: '网络拓扑',
      headerRightText: '欢迎使用'
    }
  },
  computed: {
    nodes() {
      return this.topologyNodes.map(node => ({ ...node, datasets: datasetsForNode(this.datasets, node.nodeId) }))
    },
    selectedNode() {
      return this.nodes.find(node => node.id === this.selectedNodeId) || null
    },
    selectedNodeDatasets() {
      return this.selectedNode ? this.selectedNode.datasets : []
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
    this.fetchData()
    this.refreshDatasets()
    this.datasetTimer = window.setInterval(this.refreshDatasets, 10000)
    this.refreshTimer = window.setInterval(() => this.fetchData(false, true), 1000)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    window.clearInterval(this.refreshTimer)
    window.clearInterval(this.datasetTimer)
    this.requestVersion++
  },
  methods: {
    async refreshDatasets() {
      if (this.datasetsLoading) return
      this.datasetsLoading = true
      try {
        const datasets = await fetchAllPages(fetchRegisteredDatasets, { silent: true })
        if (this._isDestroyed) return
        this.datasets = keepStableCollection(this.datasets, datasets)
        this.datasetError = ''
      } catch (error) {
        this.datasetError = `数据集加载失败（保留上次结果）：${error.message}`
      } finally {
        this.datasetsLoading = false
      }
    },
    async fetchData(refit = true, silent = false) {
      if (silent && this.refreshing) return
      const version = ++this.requestVersion
      this.refreshing = true
      if (!silent) this.loading = true
      try {
        const options = silent ? { silent: true } : {}
        const topology = await fetchNetworkTopology(this.activeOnly, options)
        if (version !== this.requestVersion) return
        const nextNodes = this.normalizeNodes(topology.nodes || [])
        const nextEdges = this.normalizeEdges(topology.edges || [])
        this.topologyNodes = keepStableCollection(this.topologyNodes, nextNodes)
        this.edges = keepStableCollection(this.edges, nextEdges)
        if (!this.nodes.some(node => node.id === this.selectedNodeId)) {
          this.selectedNodeId = this.nodes.length ? this.nodes[0].id : ''
        }
        this.lastUpdatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false })
        this.topologyError = ''
      } catch (err) {
        if (version !== this.requestVersion) return
        this.topologyError = `节点状态更新失败（保留上次结果）：${err.message}`
        console.error('获取网络拓扑失败:', err)
        if (!silent) this.$message.error(err.message || '获取网络拓扑失败')
      } finally {
        if (version === this.requestVersion) {
          this.loading = false
          this.refreshing = false
          this.computeClusters()
          // 数据轮询只更新内容，不重复把 SVG 的实测高度写回布局。
          // 否则 SVG 的行盒基线会在每次测量时累加约 4px，持续把下方数据集面板向下推。
          if (refit || !this.svgWidth || !this.svgHeight) {
            this.$nextTick(() => {
              this.initSvgSize()
              if (refit) this.fit()
            })
          }
        }
      }
    },
    refreshTopology() {
      this.fetchData(true)
    },
    normalizeNodes(nodes) {
      return (nodes || []).map((n, index) => {
        const id = String(n.id ?? n.label ?? n.name ?? `node-${index}`).trim()
        const label = String(n.label ?? n.name ?? id).trim()
        const x = Number(n.x)
        const y = Number(n.y)

        return {
          ...n,
          id,
          label,
          x,
          y,
          width: Number(n.width) || 110,
          height: Math.max(Number(n.height) || 44, 74),
          cpu: n.cpu == null ? null : Number(n.cpu),
          disk: n.memory == null ? n.disk : n.memory
        }
      }).filter(n => Number.isFinite(n.x) && Number.isFinite(n.y))
    },
    normalizeEdges(edges) {
      return (edges || []).map((e, index) => ({
        ...e,
        id: e.id || `edge-${index}`,
        source: String(e.source ?? e.from ?? '').trim(),
        target: String(e.target ?? e.to ?? '').trim(),
        latency: Number(e.latency ?? e.delay ?? 0),
        bandwidth: Number(e.bandwidth ?? e.bw ?? 0)
      })).filter(e => e.source && e.target)
    },
    datasetBelongsToNode(dataset, node) {
      if (dataset.dataNodeId != null && node.nodeId != null) {
        return String(dataset.dataNodeId) === String(node.nodeId)
      }
      const nodeNames = [node.id, node.label, node.nodeName, node.name]
        .filter(Boolean)
        .map(value => String(value).trim())
      return dataset.dataServer != null && nodeNames.includes(String(dataset.dataServer).trim())
    },
    selectNode(node) {
      this.selectedNodeId = node.id
      this.hideTip()
    },
    formatBytes,
    computeClusters() {
      if (!this.nodes.length) {
        this.clusters = []
        return
      }

      const xs = this.nodes.flatMap(n => [n.x - n.width / 2, n.x + n.width / 2])
      const ys = this.nodes.flatMap(n => [n.y - n.height / 2, n.y + n.height / 2])
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const padding = 60

      this.clusters = [
        {
          id: 'all-nodes',
          label: '集群 1',
          bounds: {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
          },
          center: { x: (minX + maxX) / 2, y: minY - padding - 20 }
        }
      ]
    },

    initSvgSize() {
      const container = this.$refs.svg && this.$refs.svg.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      this.svgWidth = Math.max(0, Math.floor(rect.width))
      this.svgHeight = Math.max(0, Math.floor(rect.height))
    },

    onResize() {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.initSvgSize()
        this.fit()
      }, 80)
    },

    fit() {
      if (!this.nodes.length || !this.svgWidth || !this.svgHeight) return

      const pad = 40
      const nodeXs = this.nodes.flatMap(n => [n.x - n.width / 2, n.x + n.width / 2])
      const nodeYs = this.nodes.flatMap(n => [n.y - n.height / 2, n.y + n.height / 2])

      let minX = Math.min(...nodeXs)
      let maxX = Math.max(...nodeXs)
      let minY = Math.min(...nodeYs)
      let maxY = Math.max(...nodeYs)

      if (this.clusters.length) {
        const clusterXs = this.clusters.flatMap(c => [c.bounds.x, c.bounds.x + c.bounds.width])
        const clusterYs = this.clusters.flatMap(c => {
          const labelTop = c.bounds.y - 40
          return [labelTop, c.bounds.y + c.bounds.height]
        })

        minX = Math.min(minX, ...clusterXs)
        maxX = Math.max(maxX, ...clusterXs)
        minY = Math.min(minY, ...clusterYs)
        maxY = Math.max(maxY, ...clusterYs)
      }

      minX -= pad
      maxX += pad
      minY -= pad
      maxY += pad

      const contentW = maxX - minX
      const contentH = maxY - minY

      const scaleX = this.svgWidth / contentW
      const scaleY = this.svgHeight / contentH
      this.scale = Math.min(scaleX, scaleY, 1.2)

      const scaledW = contentW * this.scale
      const scaledH = contentH * this.scale

      this.pan.x = (this.svgWidth - scaledW) / 2 - minX * this.scale
      this.pan.y = (this.svgHeight - scaledH) / 2 - minY * this.scale
    },

    // 滚轮缩放（以鼠标为中心）
    handleWheel(e) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const oldScale = this.scale
      const newScale = Math.max(0.3, Math.min(oldScale * delta, 5))

      const rect = this.$refs.svg.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      this.pan.x = mx - (mx - this.pan.x) * (newScale / oldScale)
      this.pan.y = my - (my - this.pan.y) * (newScale / oldScale)
      this.scale = newScale
    },

    // 拖拽平移
    startDrag(e) {
      if (e.button !== 0) return
      this.isDragging = true
      this.dragStart.x = e.clientX
      this.dragStart.y = e.clientY
      this.panStart.x = this.pan.x
      this.panStart.y = this.pan.y
      this.$el.style.cursor = 'grabbing'
    },
    stopDrag() {
      this.isDragging = false
      this.$el.style.cursor = 'default'
    },
    handleMouseMove(e) {
      this.mousePos.x = e.clientX
      this.mousePos.y = e.clientY

      if (!this.isDragging) return
      const dx = e.clientX - this.dragStart.x
      const dy = e.clientY - this.dragStart.y
      this.pan.x = this.panStart.x + dx
      this.pan.y = this.panStart.y + dy
    },

    getEdgePath(e) {
      const s = this.nodes.find(n => n.id === e.source)
      const t = this.nodes.find(n => n.id === e.target)
      if (!s || !t) return ''
      return `M${s.x},${s.y} L${t.x},${t.y}`
    },
    getEdgeColor(latency) {
      const r = Math.min(latency / 200, 1)
      return `rgb(${82 + 173 * r}, ${196 - 119 * r}, ${26 + 53 * r})`
    },
    getEdgeWidth(bw) {
      return Math.max(1, Math.min(6, (bw - 50) / 950 * 5 + 1))
    },
    getNodeColor(node) {
      const colors = { AVAILABLE: '#52c41a', DISABLED: '#909399', INACTIVE: '#e6a23c' }
      return colors[node.effectiveStatus] || '#f56c6c'
    },
    getNodeFill(node) {
      const colors = { AVAILABLE: '#f0f9eb', DISABLED: '#f4f4f5', INACTIVE: '#fdf6ec' }
      return colors[node.effectiveStatus] || '#fef0f0'
    },

    // 悬浮提示
    showTip(type, data, event) {
      let html = ''
      const esc = value => String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      if (type === 'node') {
        html = `
          <div style="min-width:220px;line-height:1.6;">
            <div><b>节点名称：</b>${esc(data.label)}</div>
            <div><b>CPU：</b>${data.cpu == null ? '暂无数据' : data.cpu + '%'}</div>
            <div><b>内存：</b>${data.disk == null ? '暂无数据' : data.disk + '%'}</div>
            <div><b>有效状态：</b>${esc(data.effectiveStatus || 'UNKNOWN')}</div>
            <div><b>注册状态：</b>${esc(data.registrationStatus || 'UNKNOWN')}</div>
            <div><b>观测状态：</b>${esc(data.observedStatus || 'UNKNOWN')}</div>
            <div><b>可调度：</b>${data.schedulable ? '是' : '否'}</div>
            <div><b>数据集：</b>${data.datasets.length} 个</div>
            ${data.statusReason ? `<div><b>原因：</b>${esc(data.statusReason)}</div>` : ''}
          </div>
        `
      } else if (type === 'edge') {
        const s = this.nodes.find(n => n.id === data.source)?.label || data.source
        const t = this.nodes.find(n => n.id === data.target)?.label || data.target
        html = `
          <div style="min-width:220px;line-height:1.6;">
            <div><b>源 → 目的：</b>${esc(s)} → ${esc(t)}</div>
            <div><b>延迟：</b>${data.latency} ms</div>
            <div><b>带宽：</b>${data.bandwidth} Mbps</div>
          </div>
        `
      }

      this.tip = {
        visible: true,
        html,
        style: { left: `${this.mousePos.x + 15}px`, top: `${this.mousePos.y + 15}px` }
      }
    },
    hideTip() {
      this.tip.visible = false
    }
  }
}
</script>

<style scoped>
.analyze-page {
  height: calc(100vh - 90px);
  background: #ffffff;
  display: flex;
  flex-direction: column;
}
.global-header {
  height: 50px;
  background: #202231;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-sizing: border-box;
}
.brand {
  font-size: 16px;
  font-weight: 600;
}
.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.header-avatar {
  margin-right: 4px;
}
.header-user {
  font-size: 14px;
}
.breadcrumb-bar {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: #f0f2f5;
  color: #666666;
  box-sizing: border-box;
}
.page-main {
  flex: 1;
  padding: 0px 16px 0px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  background: #f5f7fa;
}
.copyright-bar {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
  font-size: 12px;
  background: transparent;
  flex-shrink: 0;
  background: #f5f7fa;
}
.content-card {
  flex: 1;
  min-height: 0;
  background: #ffffff;
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.kiali-topo {
  position: relative;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  user-select: none;
}
.toolbar {
  position: absolute; top: 12px; left: 12px; z-index: 100;
  background: rgba(255,255,255,0.95); padding: 8px 12px;
  border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex; align-items: center; gap: 12px; font-size: 13px;
}
.refresh-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding-left: 4px;
  color: #7a8494;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.refresh-time i { color: #497aae; }
.legend { display: flex; align-items: center; gap: 8px; color: #666; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.available { background: #52c41a; }
.inactive { background: #909399; }
.offline { background: #f56c6c; }
.svg-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
}
.svg-container svg { display: block; }
.svg-container:active { cursor: grabbing; }
.server-icon {
  pointer-events: none;
  fill: rgba(255, 255, 255, 0.9);
  stroke: #497aae;
  stroke-width: 1.2;
}
.server-icon circle { fill: #52c41a; stroke: none; }
.server-icon line { stroke: #7a8494; stroke-width: 1; }
.dataset-panel {
  flex: 0 0 auto;
  min-height: 190px;
  margin: 16px 24px 8px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}
.dataset-panel__header {
  min-height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  background: #f8fafb;
  color: #303133;
}
.dataset-panel__header strong {
  margin-right: 10px;
}
.dataset-count,
.dataset-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
.page-footer { padding: 0 3vw 3vw; box-sizing: border-box; }
:deep(.el-button--primary),
:deep(.el-button--default) {
  background: linear-gradient(90deg, #4ec58c, #497aae);
  border-color: #4ec58c;
  color: #ffffff;
}
:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus),
:deep(.el-button--default:hover),
:deep(.el-button--default:focus) {
  background: linear-gradient(90deg, #3da371, #335f8d);
  border-color: #0bb677;
  color: #ffffff;
}
.tooltip {
  position: fixed; z-index: 9999; background: white; border-radius: 8px;
  padding: 12px 16px; font-size: 13px; color: #333; pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18); border: 1px solid #eee;
  max-width: 280px; line-height: 1.6;
}
</style>
