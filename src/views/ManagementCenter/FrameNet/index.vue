<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div v-loading="loading" class="content-card">
        <div class="kiali-topo">
          <div class="topology-header">
            <div class="topology-heading">
              <h2>网络拓扑</h2>
              <span>{{ nodes.length }} 个节点<span class="count-divider">/</span>{{ edges.length }} 条连接</span>
            </div>
            <div class="toolbar">
              <span class="refresh-time" title="最近更新时间">
                <i class="el-icon-time" />{{ lastUpdatedAt || '--:--:--' }}
              </span>
              <el-switch v-model="activeOnly" active-text="只看可用节点" @change="refreshTopology" />
              <el-button size="small" icon="el-icon-full-screen" @click="fit">自适应</el-button>
            </div>
          </div>

          <div class="topology-canvas">
            <div
              class="svg-container"
              @wheel.prevent="handleWheel"
              @mousedown="startDrag"
              @mousemove="handleMouseMove"
              @mouseup="stopDrag"
              @mouseleave="stopDrag"
            >
              <svg ref="svg" :width="svgWidth" :height="svgHeight" aria-label="网络节点连接图">
                <g :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`">
                  <!-- 链路 -->
                  <g v-for="e in edges" :key="e.id" class="topology-edge" @mouseenter="showTip('edge', e, $event)" @mouseleave="hideTip">
                    <path
                      :d="getEdgePath(e)"
                      class="edge-line"
                      :class="{ 'is-connected': isConnectedEdge(e), 'is-unavailable': e.active === false }"
                      :stroke-dasharray="e.active === false ? '5 6' : null"
                    />
                    <path :d="getEdgePath(e)" class="edge-hit-area" />
                  </g>

                  <!-- 节点 -->
                  <g
                    v-for="n in nodes"
                    :key="n.id"
                    class="topology-node"
                    :class="{ 'is-selected': selectedNodeId === n.id }"
                    :transform="`translate(${n.x}, ${n.y})`"
                    role="button"
                    tabindex="0"
                    :aria-label="`${n.label}，${n.datasetSummary}`"
                    :aria-pressed="selectedNodeId === n.id ? 'true' : 'false'"
                    @mousedown.stop
                    @click.stop="selectNode(n)"
                    @keydown.enter.prevent="selectNode(n)"
                    @keydown.space.prevent="selectNode(n)"
                    @mouseenter="showTip('node', n, $event)"
                    @mouseleave="hideTip"
                  >
                    <circle class="node-halo" :r="nodeRadius + 8" />
                    <circle class="node-disc" :r="nodeRadius" />
                    <circle r="5" :fill="getNodeColor(n)" class="node-status" />
                    <text y="46" class="node-name" text-anchor="middle">{{ n.label }}</text>
                    <text y="64" class="node-datasets" text-anchor="middle">{{ n.datasetSummary }}</text>
                  </g>
                </g>
              </svg>
            </div>
            <div v-if="!nodes.length && !loading" class="topology-empty">{{ activeOnly ? '暂无可用节点' : '暂无网络节点' }}</div>
          </div>

          <div class="topology-caption">
            <span>滚轮缩放 · 拖拽平移 · 点击节点查看数据集</span>
            <span class="legend">
              <span><i class="dot available" />可用</span>
              <span><i class="dot inactive" />未启用</span>
              <span><i class="dot offline" />异常/离线</span>
              <span><i class="legend-line" />链路未就绪</span>
            </span>
          </div>

          <!-- 悬浮提示 -->
          <div v-if="tip.visible" ref="topologyTip" class="tooltip" :style="tip.style" v-html="tip.html" />
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
import { fetchRegisteredDatasets, fetchRegisteredNodes } from '@/api/registrationApi'
import { fetchAllPages, datasetsForNode, formatBytes } from '@/utils/dataset-catalog'
import { keepStableCollection } from '@/utils/live-refresh'
import { layoutTopology, topologyEdgePath, NODE_RADIUS } from '@/utils/topology-layout'
import { nodeLocation, summarizeNodeDatasets } from '@/utils/topology-node-details'

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
      registeredNodes: [],
      nodeDetailsLoading: false,
      nodeDetailsError: '',
      nodeDetailsTimer: null,
      refreshTimer: null,
      lastUpdatedAt: '',
      selectedNodeId: '',
      activeOnly: false,
      nodeRadius: NODE_RADIUS,
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
      return this.topologyNodes.map(node => {
        const details = this.registeredNodes.find(registered => String(registered.nodeId) === String(node.nodeId)) || {}
        const datasets = datasetsForNode(this.datasets, node.nodeId)
        return {
          ...node,
          internalIp: details.internalIp || node.internalIp,
          externalIp: node.externalIp || details.externalIp,
          location: nodeLocation({ ...node, ...details }),
          datasets,
          datasetSummary: summarizeNodeDatasets(datasets)
        }
      })
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
    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(this.$refs.svg.parentElement)
    this.fetchData()
    this.refreshDatasets()
    this.refreshNodeDetails()
    this.nodeDetailsTimer = window.setInterval(this.refreshNodeDetails, 10000)
    this.datasetTimer = window.setInterval(this.refreshDatasets, 10000)
    this.refreshTimer = window.setInterval(() => this.fetchData(false, true), 1000)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    this.resizeObserver.disconnect()
    window.clearTimeout(this.resizeTimer)
    window.clearInterval(this.refreshTimer)
    window.clearInterval(this.datasetTimer)
    window.clearInterval(this.nodeDetailsTimer)
    this.requestVersion++
  },
  methods: {
    async refreshNodeDetails() {
      if (this.nodeDetailsLoading) return
      this.nodeDetailsLoading = true
      try {
        const nodes = await fetchAllPages(fetchRegisteredNodes, { silent: true })
        if (this._isDestroyed) return
        this.registeredNodes = keepStableCollection(this.registeredNodes, nodes)
        this.nodeDetailsError = ''
      } catch (error) {
        this.nodeDetailsError = 'IP / 位置信息加载失败，保留上次结果'
      } finally {
        this.nodeDetailsLoading = false
      }
    },
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
        const nextEdges = this.normalizeEdges(topology.edges || [])
        const nextNodes = layoutTopology(this.normalizeNodes(topology.nodes || []), nextEdges)
        const layoutChanged = nextNodes.length !== this.topologyNodes.length || nextNodes.some(node => {
          const previous = this.topologyNodes.find(current => current.id === node.id)
          return !previous || previous.x !== node.x || previous.y !== node.y
        })
        refit = refit || layoutChanged
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
        return {
          ...n,
          id,
          label,
          cpu: n.cpu == null ? null : Number(n.cpu),
          disk: n.memory == null ? n.disk : n.memory
        }
      })
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

      const pad = 20
      const nodeXs = this.nodes.flatMap(n => {
        const halfWidth = Math.max(140, n.label.length * 4.5)
        return [n.x - halfWidth, n.x + halfWidth]
      })
      const nodeYs = this.nodes.flatMap(n => [n.y - this.nodeRadius - 8, n.y + 72])

      let minX = Math.min(...nodeXs)
      let maxX = Math.max(...nodeXs)
      let minY = Math.min(...nodeYs)
      let maxY = Math.max(...nodeYs)

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
      return topologyEdgePath(s, t)
    },
    isConnectedEdge(edge) {
      return edge.source === this.selectedNodeId || edge.target === this.selectedNodeId
    },
    getNodeColor(node) {
      const colors = { AVAILABLE: '#279b76', DISABLED: '#a4acb9', INACTIVE: '#a4acb9' }
      return colors[node.effectiveStatus] || '#df7373'
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
            <div><b>内网 IP：</b>${esc(data.internalIp || (this.nodeDetailsLoading ? '加载中…' : '未登记'))}</div>
            <div title="节点探测到的公网出口 IP；共用 NAT 的节点可能相同"><b>公网 IP：</b>${esc(data.externalIp || (this.nodeDetailsLoading ? '加载中…' : '未获取'))}</div>
            <div><b>对应位置：</b>${esc(data.location || '位置未配置')}</div>
            ${this.nodeDetailsError ? `<div class="tip-warning">${esc(this.nodeDetailsError)}</div>` : ''}
            <div><b>CPU：</b>${data.cpu == null ? '暂无数据' : data.cpu + '%'}</div>
            <div><b>内存：</b>${data.disk == null ? '暂无数据' : data.disk + '%'}</div>
            <div><b>有效状态：</b>${esc(data.effectiveStatus || 'UNKNOWN')}</div>
            <div><b>注册状态：</b>${esc(data.registrationStatus || 'UNKNOWN')}</div>
            <div><b>观测状态：</b>${esc(data.observedStatus || 'UNKNOWN')}</div>
            <div><b>可调度：</b>${data.schedulable ? '是' : '否'}</div>
            <div><b>数据集：</b>${esc(summarizeNodeDatasets(data.datasets))}</div>
            ${data.statusReason ? `<div><b>原因：</b>${esc(data.statusReason)}</div>` : ''}
          </div>
        `
      } else if (type === 'edge') {
        const s = this.nodes.find(n => n.id === data.source)?.label || data.source
        const t = this.nodes.find(n => n.id === data.target)?.label || data.target
        html = `
          <div style="min-width:220px;line-height:1.6;">
            <div><b>连接：</b>${esc(s)} — ${esc(t)}</div>
            <div><b>链路状态：</b>${esc(data.status || (data.active === false ? '未就绪' : '可用'))}</div>
            <div><b>延迟：</b>${data.latency} ms</div>
            <div><b>带宽：</b>${data.bandwidth} Mbps</div>
          </div>
        `
      }

      this.tip = {
        visible: true,
        html,
        style: { left: `${Math.min(event.clientX + 16, window.innerWidth - 300)}px`, top: `${Math.max(8, Math.min(event.clientY + 16, window.innerHeight - 270))}px` }
      }
      this.$nextTick(() => {
        const tipElement = this.$refs.topologyTip
        if (!tipElement || !this.tip.visible) return
        const { width, height } = tipElement.getBoundingClientRect()
        this.tip.style = {
          left: `${Math.max(8, Math.min(event.clientX + 16, window.innerWidth - width - 8))}px`,
          top: `${Math.max(8, Math.min(event.clientY + 16, window.innerHeight - height - 8))}px`
        }
      })
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
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  user-select: none;
}
.topology-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 10px;
  flex-shrink: 0;
}
.topology-heading { display: flex; align-items: center; gap: 16px; }
.topology-heading h2 { margin: 0; font-size: 16px; font-weight: 600; color: #344252; }
.topology-heading > span { color: #939daa; font-size: 12px; white-space: nowrap; }
.count-divider { margin: 0 10px; color: #d5dae1; }
.toolbar {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 12px;
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
.refresh-time i { color: #939daa; }
.topology-canvas { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.topology-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 24px 0;
  flex-shrink: 0;
  color: #939daa;
  font-size: 12px;
}
.legend { display: flex; align-items: center; gap: 18px; }
.legend > span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.available { background: #279b76; }
.inactive { background: #a4acb9; }
.offline { background: #df7373; }
.legend-line { width: 18px; border-top: 1px dashed #9aa6b5; }
.topology-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-size: 14px;
  color: #939daa;
}
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
.edge-line {
  fill: none;
  stroke: #9aa6b5;
  stroke-width: 1.6;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.edge-line.is-connected { stroke: #789b93; stroke-width: 1.8; }
.edge-hit-area { fill: none; stroke: transparent; stroke-width: 14; vector-effect: non-scaling-stroke; pointer-events: stroke; }
.topology-node { cursor: pointer; outline: none; }
.node-halo { fill: #e8f4ef; opacity: 0; transition: opacity 150ms; }
.node-disc { fill: #fff; stroke: #697788; stroke-width: 1.8; vector-effect: non-scaling-stroke; }
.topology-node.is-selected .node-halo,
.topology-node:hover .node-halo,
.topology-node:focus-visible .node-halo { opacity: 1; }
.topology-node.is-selected .node-disc,
.topology-node:hover .node-disc,
.topology-node:focus-visible .node-disc { stroke: #279b76; fill: #f9fdfb; }
.node-name { font-size: 17px; font-weight: 600; fill: #384452; }
.node-datasets { font-size: 14px; fill: #8c97a5; }
.node-name, .node-datasets { pointer-events: none; paint-order: stroke fill; stroke: #fff; stroke-width: 4px; stroke-linejoin: round; }
.node-status { pointer-events: none; }
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
.tooltip {
  position: fixed; z-index: 9999; background: white; border-radius: 8px;
  padding: 12px 16px; font-size: 13px; color: #333; pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18); border: 1px solid #eee;
  max-width: 280px; line-height: 1.6;
  overflow-wrap: anywhere;
}
@media (max-width: 1000px) {
  .topology-header { flex-wrap: wrap; gap: 10px; padding-top: 12px; }
  .topology-caption { flex-wrap: wrap; gap: 8px; }
  .toolbar { gap: 12px; }
}
</style>
