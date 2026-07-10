import type {
  ImpactAnalysisResult,
  TopologyEdge,
  TopologyGraph,
  TopologyNode,
} from './types'

const SWITCH_TYPES = new Set(['breaker', 'disconnector'])

function isSwitch(node: TopologyNode): boolean {
  return SWITCH_TYPES.has(node.type)
}

function isConducting(node: TopologyNode): boolean {
  if (!isSwitch(node)) return true
  return node.closed !== false
}

/** 构建导通邻接表：分位开关不作为中转节点（其邻接边全部断开） */
export function buildConductingAdjacency(
  graph: TopologyGraph,
): Map<string, Set<string>> {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const adj = new Map<string, Set<string>>()

  for (const n of graph.nodes) {
    adj.set(n.id, new Set())
  }

  const link = (a: string, b: string) => {
    adj.get(a)?.add(b)
    adj.get(b)?.add(a)
  }

  for (const edge of graph.edges) {
    const s = nodeMap.get(edge.source)
    const t = nodeMap.get(edge.target)
    if (!s || !t) continue

    // 任一分位开关端点都会阻断该边
    if (!isConducting(s) || !isConducting(t)) continue
    link(edge.source, edge.target)
  }

  return adj
}

function bfsIsland(
  startId: string,
  adj: Map<string, Set<string>>,
): Set<string> {
  const visited = new Set<string>()
  if (!adj.has(startId)) return visited
  const queue = [startId]
  visited.add(startId)
  while (queue.length) {
    const cur = queue.shift()!
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }
  return visited
}

/** 在导通图上求 source -> target 的一条最短路径（BFS） */
export function shortestPath(
  adj: Map<string, Set<string>>,
  sourceId: string,
  targetId: string,
): string[] | null {
  if (!adj.has(sourceId) || !adj.has(targetId)) return null
  if (sourceId === targetId) return [sourceId]

  const prev = new Map<string, string | null>()
  const queue = [sourceId]
  prev.set(sourceId, null)

  while (queue.length) {
    const cur = queue.shift()!
    for (const next of adj.get(cur) ?? []) {
      if (prev.has(next)) continue
      prev.set(next, cur)
      if (next === targetId) {
        const path: string[] = []
        let walk: string | null = targetId
        while (walk != null) {
          path.push(walk)
          walk = prev.get(walk) ?? null
        }
        path.reverse()
        return path
      }
      queue.push(next)
    }
  }
  return null
}

/** 找出因分闸而阻断、且与故障岛相邻的开关 */
export function findBlockingSwitches(
  graph: TopologyGraph,
  island: Set<string>,
): string[] {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
  const blocked = new Set<string>()

  for (const edge of graph.edges) {
    const s = nodeMap.get(edge.source)
    const t = nodeMap.get(edge.target)
    if (!s || !t) continue

    const sOpen = isSwitch(s) && !isConducting(s)
    const tOpen = isSwitch(t) && !isConducting(t)

    if (sOpen && island.has(edge.target)) blocked.add(s.id)
    if (tOpen && island.has(edge.source)) blocked.add(t.id)

    // 开关本身在岛边界：一端在岛内、开关分位
    if (sOpen && island.has(s.id)) blocked.add(s.id)
    if (tOpen && island.has(t.id)) blocked.add(t.id)
  }

  return [...blocked]
}

/**
 * 影响范围分析：
 * 1. 按分合构建导通图
 * 2. 从故障点 BFS 得受影响岛
 * 3. 电源到故障点路径上的节点 = 电源侧；岛内其余 = 负荷侧
 */
export function analyzeImpact(
  graph: TopologyGraph,
  faultNodeId: string,
  powerSourceIds?: string[],
): ImpactAnalysisResult {
  const sources =
    powerSourceIds ??
    graph.nodes
      .filter((n) => n.isPowerSource || n.type === 'powerSource')
      .map((n) => n.id)

  const adj = buildConductingAdjacency(graph)
  const island = bfsIsland(faultNodeId, adj)

  const sourceSide = new Set<string>()
  for (const src of sources) {
    if (!island.has(src) && src !== faultNodeId) {
      // 电源不在岛内则无法经导通路径到达故障点
      continue
    }
    const path = shortestPath(adj, src, faultNodeId)
    if (!path) continue
    for (const id of path) {
      if (island.has(id)) sourceSide.add(id)
    }
  }

  // 故障点本身归入电源侧（若有电源路径）或单独保留在岛内
  const loadSide: string[] = []
  for (const id of island) {
    if (!sourceSide.has(id)) loadSide.push(id)
  }

  const blockedBy = findBlockingSwitches(graph, island)

  return {
    affectedIsland: [...island],
    sourceSide: [...sourceSide],
    loadSide,
    blockedBy,
    faultNodeId,
    powerSourceIds: sources,
  }
}

export function getNodeMap(graph: TopologyGraph): Map<string, TopologyNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]))
}

export function getEdgesOf(graph: TopologyGraph, nodeId: string): TopologyEdge[] {
  return graph.edges.filter((e) => e.source === nodeId || e.target === nodeId)
}
