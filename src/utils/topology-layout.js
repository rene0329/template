export const NODE_RADIUS = 24

// Lay out the actual graph, not the API's circular presentation coordinates.
// Stable ordering keeps metric polling from moving nodes around.
export function layoutTopology(nodes, edges) {
  const neighbors = new Map(nodes.map(node => [node.id, new Set()]))
  edges.forEach(({ source, target }) => {
    if (source === target || !neighbors.has(source) || !neighbors.has(target)) return
    neighbors.get(source).add(target)
    neighbors.get(target).add(source)
  })
  const order = (a, b) => neighbors.get(b).size - neighbors.get(a).size || a.localeCompare(b)
  const remaining = new Set([...neighbors.keys()].sort(order))
  const positions = new Map()
  let componentOffset = 0

  while (remaining.size) {
    const root = [...remaining][0]
    const component = new Map([[root, { x: 0, y: 0, angle: 0 }]])
    remaining.delete(root)
    const peers = [...neighbors.get(root)].sort(order)
    const branches = peers.filter(id => neighbors.get(id).size > 1)
    const leaves = peers.filter(id => neighbors.get(id).size === 1)
    const place = (id, parent, angle, distance) => {
      const radians = angle * Math.PI / 180
      component.set(id, {
        x: parent.x + Math.cos(radians) * distance,
        y: parent.y + Math.sin(radians) * distance,
        angle
      })
      remaining.delete(id)
    }
    const spread = (index, total, from, to) => total === 1 ? (from + to) / 2 : from + (to - from) * index / (total - 1)
    branches.forEach((id, index) => place(id, component.get(root), spread(index, branches.length, 145, 35), 245))
    leaves.forEach((id, index) => {
      const angle = branches.length
        ? spread(index, leaves.length, -145, -35)
        : -90 + index * 360 / Math.max(leaves.length, 1)
      place(id, component.get(root), angle, 290)
    })

    const queue = [...peers]
    for (let index = 0; index < queue.length; index++) {
      const parent = component.get(queue[index])
      const children = [...neighbors.get(queue[index])].filter(id => remaining.has(id)).sort(order)
      children.forEach((id, childIndex) => {
        const angle = parent.angle + spread(childIndex, children.length, -35, 35)
        place(id, parent, angle, 245)
        queue.push(id)
      })
    }

    const xs = [...component.values()].map(point => point.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    component.forEach((point, id) => positions.set(id, {
      x: point.x - minX + componentOffset,
      // A landscape canvas needs less vertical space than a paper sketch.
      y: point.y * 0.5
    }))
    componentOffset += maxX - minX + 190
  }

  return nodes.map(node => ({ ...node, ...positions.get(node.id) }))
}

export function topologyEdgePath(source, target) {
  if (!source || !target) return ''
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy)
  if (distance <= NODE_RADIUS * 2) return ''
  const inset = NODE_RADIUS / distance
  return `M${source.x + dx * inset},${source.y + dy * inset} L${target.x - dx * inset},${target.y - dy * inset}`
}
