import { layoutTopology, topologyEdgePath, NODE_RADIUS } from '@/utils/topology-layout'

const nodes = ['center', 'branch', 'peer', 'leaf-a', 'leaf-b', 'tip'].map(id => ({ id, label: id }))
const edges = [
  ['center', 'branch'], ['center', 'peer'], ['branch', 'peer'],
  ['center', 'leaf-a'], ['center', 'leaf-b'], ['branch', 'tip']
].map(([source, target]) => ({ source, target }))
const positions = result => Object.fromEntries(result.map(({ id, x, y }) => [id, { x, y }]))

it('places the hub between upper leaves and lower connected branches', () => {
  const graph = positions(layoutTopology(nodes, edges))
  expect(graph['leaf-a'].y).toBeLessThan(graph.center.y)
  expect(graph['leaf-b'].y).toBeLessThan(graph.center.y)
  expect(graph.branch.y).toBeGreaterThan(graph.center.y)
  expect(graph.peer.y).toBeGreaterThan(graph.center.y)
  expect(graph.branch.x).toBeLessThan(graph.center.x)
  expect(graph.peer.x).toBeGreaterThan(graph.center.x)
  expect(graph.tip.y).toBeGreaterThan(graph.branch.y)
  expect(graph.tip.x).toBeLessThan(graph.branch.x)
})

it('keeps positions stable across API ordering, coordinates, and metric updates', () => {
  const updated = [...nodes].reverse().map(node => ({ ...node, cpu: 90, x: 400, y: 900 }))
  expect(positions(layoutTopology(updated, [...edges].reverse())))
    .toEqual(positions(layoutTopology(nodes, edges)))
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
  const result = layoutTopology([...nodes, { id: 'isolated' }], [
    ...edges, { source: 'center', target: 'missing' }, { source: 'center', target: 'center' }
  ])
  expect(result.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true)
  expect(new Set(result.map(node => `${node.x},${node.y}`)).size).toBe(result.length)
  const graph = positions(result)
  expect(graph.isolated.x).toBeGreaterThan(Math.max(...nodes.map(node => graph[node.id].x)))
})

it('clips straight edges to the circle boundary instead of crossing node interiors', () => {
  expect(topologyEdgePath({ x: 0, y: 0 }, { x: 200, y: 0 }))
    .toBe(`M${NODE_RADIUS},0 L${200 - NODE_RADIUS},0`)
  expect(topologyEdgePath({ x: 0, y: 0 }, { x: 0, y: 200 }))
    .toBe(`M0,${NODE_RADIUS} L0,${200 - NODE_RADIUS}`)
  expect(topologyEdgePath(null, { x: 0, y: 0 })).toBe('')
  expect(topologyEdgePath({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe('')
})
