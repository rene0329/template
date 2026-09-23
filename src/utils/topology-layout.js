export const NODE_RADIUS = 24

// Space a node occupies on the canvas: halo above, name and dataset summary below.
const LABEL_WIDTH = 250
const LABEL_HEIGHT = 110
// Landscape ellipses: gateways on the outer ring, site members fanned beyond them.
// Members stay close to their own gateway (tight domain) while gateways sit far
// out on the ring (domains spread apart); DOMAIN_GAP is topped up afterwards by
// separateDomains() so domain boxes never touch even where two arms swing close.
const ARM_RADIUS = { x: 760, y: 190 }
const MEMBER_RADIUS = { x: 250, y: 90 }
const CENTER_OFFSET = { x: 190, y: 105 }
const DOMAIN_GAP = 60
// Same padding fit()/domainBoxes use in the Vue view, so the boxes drawn there
// match the space actually cleared here.
const DOMAIN_PAD = 34

// Lay out the actual graph the way the design sketch draws it: the best-connected
// node and its site sit in the middle, every other site branches out on its own
// diagonal arm, on the side of the node it links to, with its members fanned away
// from its gateway. Sites come from node.site, or from the links when it is missing.
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

  const hub = ids[0]
  const bySize = (a, b) => b.length - a.length || order(a[0], b[0])
  let center = []
  let arms = []
  if (nodes.every(node => node.site)) {
    const siteOf = new Map(nodes.map(node => [node.id, String(node.site)]))
    const sites = new Map()
    ids.filter(id => id !== hub).forEach(id => sites.set(siteOf.get(id), [...(sites.get(siteOf.get(id)) || []), id]))
    center = sites.get(siteOf.get(hub)) || []
    sites.delete(siteOf.get(hub))
    arms = [...sites.values()].sort(bySize)
  } else {
    // Without sites, a site is whatever stays connected once the hub is taken out.
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
    center = groups.filter(group => group.every(id => neighbors.get(hub).has(id))).sort(bySize)[0] || []
    arms = groups.filter(group => group !== center).sort(bySize)
  }

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
  // points straight down into the hub's site.
  const slots = arms.map((arm, index) => (arms.length % 2 ? 0 : -90 + 180 / arms.length) - index * 360 / arms.length)
  const free = slots.map((slot, index) => index)
  const scale = Math.max(1, arms.length / 6)
  const armRadius = { x: ARM_RADIUS.x * scale, y: ARM_RADIUS.y * scale }
  const slotOf = new Map()
  const take = (arm, slot) => {
    free.splice(free.indexOf(slot), 1)
    slotOf.set(arm, slot)
  }
  const links = new Map(arms.map(arm => {
    const viaHub = arm.find(id => neighbors.get(id).has(hub))
    const viaSite = arm.find(id => center.some(member => neighbors.get(id).has(member)))
    const anchor = viaHub || !viaSite ? hub : center.find(member => neighbors.get(viaSite).has(member))
    return [arm, { gateway: viaHub || viaSite || arm[0], anchor }]
  }))
  // An arm hanging off a member of the hub's site takes the slot on that member's side.
  arms.filter(arm => links.get(arm).anchor !== hub).forEach(arm => {
    const target = positions.get(links.get(arm).anchor)
    const alignment = slot => {
      const x = Math.cos(radians(slots[slot])) * armRadius.x
      const y = Math.sin(radians(slots[slot])) * armRadius.y
      return (x * target.x + y * target.y) / Math.hypot(x, y) / Math.hypot(target.x, target.y)
    }
    take(arm, free.reduce((best, slot) => alignment(slot) > alignment(best) ? slot : best))
  })
  // Heavy hub-linked arms are paired on opposite sides.
  let previous = 0
  arms.filter(arm => !slotOf.has(arm)).forEach((arm, armIndex) => {
    const opposite = (previous + Math.floor(slots.length / 2)) % slots.length
    take(arm, armIndex % 2 && free.includes(opposite) ? opposite : free[0])
    previous = slotOf.get(arm)
  })

  arms.forEach(arm => {
    const angle = slots[slotOf.get(arm)]
    const { gateway } = links.get(arm)
    place(gateway, positions.get(hub), angle, armRadius)

    // Members a site's own links cannot reach still hang off its gateway.
    const reachable = new Set([gateway])
    for (const id of reachable) {
      neighbors.get(id).forEach(peer => {
        if (arm.includes(peer)) reachable.add(peer)
      })
    }
    const directions = new Map([[gateway, angle]])
    const queue = [gateway]
    for (let index = 0; index < queue.length; index++) {
      const parent = queue[index]
      const heading = directions.get(parent)
      const children = arm.filter(id => !positions.has(id) &&
        (neighbors.get(parent).has(id) || (parent === gateway && !reachable.has(id)))).sort(order)
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
  // Every site partitions the node set the same way regardless of which branch
  // built center/arms above, so this covers both the site-tagged and the
  // connectivity-derived case.
  separateDomains([[hub, ...center], ...arms], positions, nodes)
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

// Push whole domains (site groups) apart as rigid blocks so their boxes never
// overlap, leaving a clear DOMAIN_GAP between any two of them. Individual node
// spacing inside a domain is untouched — only the group as a whole is shifted.
function separateDomains(groups, positions, nodes) {
  if (groups.length < 2) return
  const labelOf = new Map(nodes.map(node => [node.id, node.label || '']))
  const boxOf = group => {
    const xs = group.flatMap(id => {
      const p = positions.get(id)
      const halfWidth = Math.max(140, labelOf.get(id).length * 4.5)
      return [p.x - halfWidth, p.x + halfWidth]
    })
    const ys = group.flatMap(id => {
      const p = positions.get(id)
      return [p.y - NODE_RADIUS - 8, p.y + 72]
    })
    return {
      minX: Math.min(...xs) - DOMAIN_PAD, maxX: Math.max(...xs) + DOMAIN_PAD,
      minY: Math.min(...ys) - DOMAIN_PAD, maxY: Math.max(...ys) + DOMAIN_PAD
    }
  }
  for (let pass = 0; pass < 60; pass++) {
    let moved = false
    groups.forEach((a, index) => groups.slice(index + 1).forEach(b => {
      const boxA = boxOf(a)
      const boxB = boxOf(b)
      const overlapX = Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX) + DOMAIN_GAP
      const overlapY = Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY) + DOMAIN_GAP
      if (overlapX <= 0 || overlapY <= 0) return
      moved = true
      const dx = (boxB.minX + boxB.maxX) / 2 - (boxA.minX + boxA.maxX) / 2
      const dy = (boxB.minY + boxB.maxY) / 2 - (boxA.minY + boxA.maxY) / 2
      if (overlapX < overlapY) {
        const shift = (overlapX / 2) * (dx < 0 ? -1 : 1)
        a.forEach(id => { positions.get(id).x -= shift })
        b.forEach(id => { positions.get(id).x += shift })
      } else {
        const shift = (overlapY / 2) * (dy < 0 ? -1 : 1)
        a.forEach(id => { positions.get(id).y -= shift })
        b.forEach(id => { positions.get(id).y += shift })
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
