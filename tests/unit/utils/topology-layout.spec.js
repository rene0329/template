import { layoutTopology, topologyEdgePath, NODE_RADIUS } from '@/utils/topology-layout'

// Mirrors the backend's derived links: every site is meshed internally, the hub site
// contains the hub, and each other site reaches the hub through one gateway.
const sites = {
  center: ['master-40', 'master-141', 'master-215'],
  sh: ['cluster-sh-1', 'cluster-sh-2', 'cluster-sh-3'],
  sz: ['cluster-sz-1', 'cluster-sz-2', 'cluster-sz-3'],
  bj: ['cluster-bj-1', 'cluster-bj-2'],
  hz: ['cluster-hz-1']
}
const mesh = members => members.flatMap((a, index) => members.slice(index + 1).map(b => [a, b]))
const nodes = Object.values(sites).flat().map(id => ({ id, label: id }))
const edges = [
  ...Object.values(sites).flatMap(mesh),
  ...['sh', 'sz', 'bj', 'hz'].map(site => [sites[site][0], 'master-40'])
].map(([source, target]) => ({ source, target }))
const positions = result => Object.fromEntries(result.map(({ id, x, y }) => [id, { x, y }]))
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
// Pairs whose name and dataset labels would collide on the canvas.
const crowded = result => result.flatMap((a, index) => result.slice(index + 1)
  .filter(b => Math.abs(a.x - b.x) < 250 && Math.abs(a.y - b.y) < 110)
  .map(b => `${a.id}/${b.id}`))

// The ZJ payload: sites are reported per node, Shenzhen hangs off master-215 and
// Hangzhou off master-141 instead of the hub.
const siteNodes = Object.entries(sites).flatMap(([site, members]) => members.map(id => ({ id, label: id, site })))
const uplinks = { 'cluster-sz-1': 'master-215', 'cluster-hz-1': 'master-141' }
const uplinkEdges = edges.map(edge => edge.target === 'master-40' && uplinks[edge.source]
  ? { ...edge, target: uplinks[edge.source] } : edge)

it('hangs sites that link to a hub-site member on that member\'s side', () => {
  const graph = positions(layoutTopology(siteNodes, uplinkEdges))
  const hub = graph['master-40']
  const quadrant = id => `${graph[id].y < hub.y ? 'upper' : 'lower'}-${graph[id].x < hub.x ? 'left' : 'right'}`
  expect(['sh', 'sz', 'bj', 'hz'].map(site => [...new Set(sites[site].map(quadrant))]))
    .toEqual([['upper-right'], ['lower-right'], ['upper-left'], ['lower-left']])
  expect(graph['master-141'].x).toBeLessThan(hub.x)
  expect(graph['master-215'].x).toBeGreaterThan(hub.x)
  expect(distance(graph['cluster-sz-1'], graph['master-215']))
    .toBeLessThan(distance(graph['cluster-sz-1'], graph['master-141']))
  expect(distance(graph['cluster-hz-1'], graph['master-141']))
    .toBeLessThan(distance(graph['cluster-hz-1'], graph['master-215']))
  expect(crowded(layoutTopology(siteNodes, uplinkEdges))).toEqual([])
})

it('keeps a site together even when its own links are missing', () => {
  const partial = uplinkEdges.filter(({ source, target }) => ![source, target].includes('cluster-sh-3'))
  const graph = positions(layoutTopology(siteNodes, partial))
  expect(graph['cluster-sh-3'].x).toBeGreaterThan(graph['master-40'].x)
  expect(graph['cluster-sh-3'].y).toBeLessThan(graph['master-40'].y)
  expect(crowded(layoutTopology(siteNodes, partial))).toEqual([])
})

it('without sites, keeps the hub site in the middle and gives every other site its own diagonal arm', () => {
  const graph = positions(layoutTopology(nodes, edges))
  const hub = graph['master-40']
  expect(graph['master-141'].y).toBeGreaterThan(hub.y)
  expect(graph['master-215'].y).toBeGreaterThan(hub.y)
  const quadrant = id => `${graph[id].y < hub.y ? 'upper' : 'lower'}-${graph[id].x < hub.x ? 'left' : 'right'}`
  const arms = ['sh', 'sz', 'bj', 'hz'].map(site => [...new Set(sites[site].map(quadrant))])
  expect(arms).toEqual([['upper-right'], ['lower-left'], ['upper-left'], ['lower-right']])
  ;['sh', 'sz', 'bj'].forEach(site => {
    const [gateway, ...members] = sites[site]
    members.forEach(id => expect(distance(graph[id], hub)).toBeGreaterThan(distance(graph[gateway], hub)))
  })
})

it('spreads nodes out so no two labels overlap', () => {
  expect(crowded(layoutTopology(nodes, edges))).toEqual([])
  const star = Array.from({ length: 14 }, (_, index) => `leaf-${index}`)
  const busy = [...star, 'hub', 'island-a', 'island-b'].map(id => ({ id, label: id }))
  const busyEdges = [...star.map(id => ['hub', id]), ['island-a', 'island-b']]
    .map(([source, target]) => ({ source, target }))
  expect(crowded(layoutTopology(busy, busyEdges))).toEqual([])
  expect(crowded(layoutTopology(nodes, []))).toEqual([])
})

it('keeps positions stable across API ordering, coordinates, and metric updates', () => {
  const updated = [...nodes].reverse().map(node => ({ ...node, cpu: 90, x: 400, y: 900 }))
  expect(positions(layoutTopology(updated, [...edges].reverse())))
    .toEqual(positions(layoutTopology(nodes, edges)))
  expect(positions(layoutTopology([...siteNodes].reverse(), [...uplinkEdges].reverse())))
    .toEqual(positions(layoutTopology(siteNodes, uplinkEdges)))
})

it('does not mutate node metadata or the actual connections', () => {
  const frozenNodes = nodes.map(node => Object.freeze({ ...node, nodeId: 12 }))
  const frozenEdges = edges.map(edge => Object.freeze({ ...edge, active: false }))
  const result = layoutTopology(Object.freeze(frozenNodes), Object.freeze(frozenEdges))
  expect(result).toHaveLength(nodes.length)
  expect(result.every(node => node.nodeId === 12)).toBe(true)
  expect(frozenNodes.every(node => node.x === undefined)).toBe(true)
  expect(frozenEdges).toEqual(edges.map(edge => ({ ...edge, active: false })))
})

it('handles empty graphs, cycles, disconnected nodes, and invalid endpoints', () => {
  expect(layoutTopology([], [])).toEqual([])
  expect(layoutTopology([{ id: 'solo' }], [])).toEqual([{ id: 'solo', x: 0, y: 0 }])
  const result = layoutTopology([...nodes, { id: 'isolated' }], [
    ...edges, { source: 'master-40', target: 'missing' }, { source: 'master-40', target: 'master-40' }
  ])
  expect(result.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true)
  expect(crowded(result)).toEqual([])
})

it('clips straight edges to the circle boundary instead of crossing node interiors', () => {
  expect(topologyEdgePath({ x: 0, y: 0 }, { x: 200, y: 0 }))
    .toBe(`M${NODE_RADIUS},0 L${200 - NODE_RADIUS},0`)
  expect(topologyEdgePath({ x: 0, y: 0 }, { x: 0, y: 200 }))
    .toBe(`M0,${NODE_RADIUS} L0,${200 - NODE_RADIUS}`)
  expect(topologyEdgePath(null, { x: 0, y: 0 })).toBe('')
  expect(topologyEdgePath({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe('')
})
