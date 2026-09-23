export const NODE_RADIUS = 24

// Space a node occupies on the canvas: halo above, name and dataset summary below.
const LABEL_WIDTH = 250
const LABEL_HEIGHT = 110
// Landscape ellipses: gateways on the outer ring, site members fanned beyond them.
const ARM_RADIUS = { x: 680, y: 170 }
const MEMBER_RADIUS = { x: 320, y: 115 }
const CENTER_OFFSET = { x: 230, y: 120 }

// Lay out the actual graph the way the design sketch draws it: the best-connected
// node and the site meshed with it sit in the middle, every other site branches out
// on its own diagonal arm with its members fanned away from its gateway.
// Stable ordering keeps metric polling from moving nodes around.
export function layoutTopology(nodes, edges) {
  const neighbors = new Map(nodes.map(node => [node.id, new Set()]))
  edges.forEach(({ source, target }) => {
    if (source === target || !neighbors.has(source) || !neighbors.has(target)) return
    neighbors.get(source).add(target)
    neighbors.get(target).add(source)
  })
  const order = (a, b) => neighbors.get(b).size - neighbors.get(a).size || a.localeCompare(b)
  const ids = [...neighbors.keys()].sort(order)
  if (!ids.length) return []

  // Sites are whatever stays connected once the hub is taken out.
  const hub = ids[0]
  const seen = new Set([hub])
  const groups = []
  ids.forEach(id => {
    if (seen.has(id)) return
    const group = [id]
    seen.add(id)
    for (let index = 0; index < group.length; index++) {
      [...neighbors.get(group[index])].sort(order).forEach(peer => {
        if (seen.has(peer)) return
        seen.add(peer)
        group.push(peer)
      })
    }
    groups.push(group.sort(order))
  })
  const bySize = (a, b) => b.length - a.length || order(a[0], b[0])
  const center = groups.filter(group => group.every(id => neighbors.get(hub).has(id))).sort(bySize)[0] || []
  const arms = groups.filter(group => group !== center).sort(bySize)

  const positions = new Map([[hub, { x: 0, y: 0 }]])
  const radians = angle => angle * Math.PI / 180
  const place = (id, origin, angle, radius) => positions.set(id, {
    x: origin.x + Math.cos(radians(angle)) * radius.x,
    y: origin.y + Math.sin(radians(angle)) * radius.y
  })
  const spread = (index, total, from, to) => total === 1 ? (from + to) / 2 : from + (to - from) * index / (total - 1)

  if (!arms.length) {
    center.forEach((id, index) => place(id, positions.get(hub), -90 + index * 360 / center.length, MEMBER_RADIUS))
  } else {
    // The hub's own site hangs just below it, clear of the diagonal arms.
    const width = CENTER_OFFSET.x * (center.length - 1)
    center.forEach((id, index) => {
      const x = spread(index, center.length, -width, width)
      const bow = center.length > 2 ? 1 - (x / width) ** 2 : 0
      positions.set(id, { x, y: CENTER_OFFSET.y + bow * 60 })
    })
  }

  // Even arm counts sit on the diagonals, odd counts start to the right, so no arm
  // points straight down into the hub's site. Heavy arms are paired on opposite sides.
  const slots = arms.map((arm, index) => (arms.length % 2 ? 0 : -90 + 180 / arms.length) - index * 360 / arms.length)
  const free = slots.map((slot, index) => index)
  const scale = Math.max(1, arms.length / 6)
  const armRadius = { x: ARM_RADIUS.x * scale, y: ARM_RADIUS.y * scale }
  let previous = 0
  arms.forEach((arm, armIndex) => {
    const opposite = (previous + Math.floor(slots.length / 2)) % slots.length
    const slot = armIndex % 2 && free.includes(opposite) ? opposite : free[0]
    free.splice(free.indexOf(slot), 1)
    previous = slot
    const angle = slots[slot]
    const gateway = arm.find(id => neighbors.get(id).has(hub)) ||
      arm.find(id => center.some(member => neighbors.get(id).has(member))) || arm[0]
    place(gateway, positions.get(hub), angle, armRadius)

    const directions = new Map([[gateway, angle]])
    const queue = [gateway]
    for (let index = 0; index < queue.length; index++) {
      const parent = queue[index]
      const heading = directions.get(parent)
      const children = [...neighbors.get(parent)].filter(id => arm.includes(id) && !positions.has(id)).sort(order)
      const width = Math.min(150, 70 * (children.length - 1))
      children.forEach((id, childIndex) => {
        const vertical = Math.sin(radians(heading)) < 0 ? -90 : 90
        // A lone member stacks vertically, as the sketch draws single storage nodes.
        const direction = children.length === 1 && Math.abs(Math.sin(radians(heading))) > 0.5
          ? vertical : spread(childIndex, children.length, heading - width / 2, heading + width / 2)
        place(id, positions.get(parent), direction, MEMBER_RADIUS)
        directions.set(id, direction)
        queue.push(id)
      })
    }
  })

  separate(ids, positions)
  return nodes.map(node => ({ ...node, ...positions.get(node.id) }))
}

// Push apart any labels that would still overlap, e.g. for crowded or unusual graphs.
function separate(ids, positions) {
  for (let pass = 0; pass < 100; pass++) {
    let moved = false
    ids.forEach((a, index) => ids.slice(index + 1).forEach(b => {
      const p = positions.get(a)
      const q = positions.get(b)
      const dx = q.x - p.x
      const dy = q.y - p.y
      const overlapX = LABEL_WIDTH - Math.abs(dx)
      const overlapY = LABEL_HEIGHT - Math.abs(dy)
      if (overlapX <= 0 || overlapY <= 0) return
      moved = true
      if (overlapX / LABEL_WIDTH < overlapY / LABEL_HEIGHT) {
        const shift = (overlapX / 2 + 1) * (dx < 0 ? -1 : 1)
        p.x -= shift
        q.x += shift
      } else {
        const shift = (overlapY / 2 + 1) * (dy < 0 ? -1 : 1)
        p.y -= shift
        q.y += shift
      }
    }))
    if (!moved) return
  }
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
