<template>
  <el-container class="analyze-page">
    <el-main class="page-main">
      <div class="content-card">
          <div class="kiali-topo">
            <div class="toolbar">
              <el-button size="small" @click="fit">自适应</el-button>
              <span class="legend">
                <i class="dot green"></i>低延迟
                <i class="dot red"></i>高延迟
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
                      fill="none"
                      stroke-linecap="round"
                      marker-end="url(#arrow)"
                      @mouseover="showTip('edge', e, $event)"
                      @mouseout="hideTip"
                      style="cursor: pointer; pointer-events: stroke;"
                    />
                  </g>

                  <!-- 节点 -->
                  <g v-for="n in nodes" :key="n.id">
                    <rect
                      :x="n.x - n.width/2"
                      :y="n.y - n.height/2"
                      :width="n.width"
                      :height="n.height"
                      rx="8"
                      fill="#fff"
                      stroke="#3066ee"
                      stroke-width="2"
                      @mouseover="showTip('node', n, $event)"
                      @mouseout="hideTip"
                      style="cursor: pointer;"
                    />
                    <text
                      :x="n.x"
                      :y="n.y + 1"
                      font-size="12"
                      fill="#333"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      style="pointer-events:none"
                    >{{ n.label }}</text>
                  </g>
                </g>
              </svg>
            </div>

            <!-- 悬浮提示 -->
            <div v-if="tip.visible" class="tooltip" :style="tip.style" v-html="tip.html"></div>
          </div>
      </div>
    </el-main>
    <div class="copyright-bar">Copyright©2025 之江实验室 版权所有</div>
  </el-container>
</template>

<script>
import { fetchNetworkTopology } from '@/api/managementCenterApi'

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
      clusters: [],
      // 从服务器获取的数据
      nodes: [],
      edges: [],
      tip: { visible: false, html: '', style: {} },
      mousePos: { x: 0, y: 0 },
      systemName: '网络拓扑',
      headerRightText: '欢迎使用'
    }
  },
  mounted() {
    this.fetchData()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await fetchNetworkTopology()
        this.nodes = res.nodes || res.data?.nodes || []
        this.edges = res.edges || res.data?.edges || []
        // 如果没有返回数据，使用默认数据
        if (this.nodes.length === 0) {
          this.nodes = [
            { id: 'master-40', label: 'master-40', x: 480, y: 280, width: 110, height: 44, cpu: 40, disk: 30 },
            { id: 'master-141', label: 'master-141', x: 660, y: 360, width: 110, height: 44, cpu: 55, disk: 45 },
            { id: 'master-215', label: 'master-215', x: 540, y: 460, width: 110, height: 44, cpu: 35, disk: 20 }
          ]
        }
        if (this.edges.length === 0) {
          this.edges = [
            { source: 'master-40', target: 'master-141', latency: 30, bandwidth: 500 },
            { source: 'master-40', target: 'master-215', latency: 45, bandwidth: 420 },
            { source: 'master-215', target: 'master-141', latency: 29, bandwidth: 540 }
          ]
        }
      } catch (err) {
        console.error('获取网络拓扑失败:', err)
        // 失败时使用默认数据
        this.nodes = [
          { id: 'master-40', label: 'master-40', x: 480, y: 280, width: 110, height: 44, cpu: 40, disk: 30 },
          { id: 'master-141', label: 'master-141', x: 660, y: 360, width: 110, height: 44, cpu: 55, disk: 45 },
          { id: 'master-215', label: 'master-215', x: 540, y: 460, width: 110, height: 44, cpu: 35, disk: 20 }
        ]
        this.edges = [
          { source: 'master-40', target: 'master-141', latency: 30, bandwidth: 500 },
          { source: 'master-40', target: 'master-215', latency: 45, bandwidth: 420 },
          { source: 'master-215', target: 'master-141', latency: 29, bandwidth: 540 }
        ]
      } finally {
        this.loading = false
        this.computeClusters()
        this.initSvgSize()
        window.addEventListener('resize', this.onResize)
        this.$nextTick(() => this.fit())
      }
    },
    computeClusters() {
      const groups = {
        'a': { label: '集群 1', nodes: ['master-40', 'master-141', 'master-215'] }
      }

      this.clusters = Object.entries(groups).map(([id, g]) => {
        const ns = this.nodes.filter(n => g.nodes.includes(n.id))
        const xs = ns.flatMap(n => [n.x - n.width/2, n.x + n.width/2])
        const ys = ns.flatMap(n => [n.y - n.height/2, n.y + n.height/2])
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)
        const padding = 60

        return {
          id,
          label: g.label,
          bounds: {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
          },
          center: { x: (minX + maxX) / 2, y: minY - padding - 20 }
        }
      })
    },

    initSvgSize() {
      const rect = this.$refs.svg.parentElement.getBoundingClientRect()
      this.svgWidth = rect.width
      this.svgHeight = rect.height
    },

    onResize() {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.initSvgSize()
        this.fit()
      }, 80)
    },

    fit() {
      const pad = 100
      const allX = this.nodes.flatMap(n => [n.x - n.width/2, n.x + n.width/2])
      const allY = this.nodes.flatMap(n => [n.y - n.height/2, n.y + n.height/2])
      const minX = Math.min(...allX) - pad
      const maxX = Math.max(...allX) + pad
      const minY = Math.min(...allY) - pad
      const maxY = Math.max(...allY) + pad

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
      return `M${s.x},${s.y} L${t.x},${t.y}`
    },
    getEdgeColor(latency) {
      const r = Math.min(latency / 200, 1)
      return `rgb(${82 + 173 * r}, ${196 - 119 * r}, ${26 + 53 * r})`
    },
    getEdgeWidth(bw) {
      return Math.max(1, Math.min(6, (bw - 50) / 950 * 5 + 1))
    },

    // 悬浮提示（去掉内存）
    showTip(type, data, event) {
      let html = ''
      if (type === 'node') {
        html = `
          <div style="min-width:220px;line-height:1.6;">
            <div><b>节点名称：</b>${data.label}</div>
            <div><b>CPU：</b>${data.cpu}%</div>
            <div><b>存储：</b>${data.disk}%</div>
          </div>
        `
      } else if (type === 'edge') {
        const s = this.nodes.find(n => n.id === data.source)?.label || data.source
        const t = this.nodes.find(n => n.id === data.target)?.label || data.target
        html = `
          <div style="min-width:220px;line-height:1.6;">
            <div><b>源 → 目的：</b>${s} → ${t}</div>
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
  background: #ffffff;
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.kiali-topo { position: relative; width: 100%; flex: 1; background: #ffffff; user-select: none; }
.toolbar {
  position: absolute; top: 12px; left: 12px; z-index: 100;
  background: rgba(255,255,255,0.95); padding: 8px 12px;
  border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex; align-items: center; gap: 12px; font-size: 13px;
}
.legend { display: flex; align-items: center; gap: 8px; color: #666; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.green { background: #52c41a; } .red { background: #ff4d4f; }
.svg-container { width: 100%; height: 100%; overflow: hidden; cursor: grab; }
.svg-container:active { cursor: grabbing; }
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