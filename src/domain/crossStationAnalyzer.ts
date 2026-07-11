import { analyzeImpact } from './connectivityAnalyzer'
import { findPort } from './projectStore'
import type {
  CrossStationImpactResult,
  GridProject,
  TopologyEdge,
  TopologyGraph,
  TopologyNode,
} from './types'

/**
 * 将工程拼成联合拓扑图：各站设备 + 联络线边（边界设备直连）
 * 节点 id 保持各站原 id（样例已保证全局唯一）
 */
export function buildUnionGraph(project: GridProject): {
  graph: TopologyGraph
  nodeStation: Map<string, string>
  tieEdgeIds: Map<string, string> // edgeId -> tieLineId
} {
  const nodes: TopologyNode[] = []
  const edges: TopologyEdge[] = []
  const nodeStation = new Map<string, string>()
  const tieEdgeIds = new Map<string, string>()

  for (const st of Object.values(project.stations)) {
    for (const n of st.graph.nodes) {
      nodes.push({ ...n, stationId: st.id })
      nodeStation.set(n.id, st.id)
    }
    for (const e of st.graph.edges) {
      edges.push({ ...e })
    }
  }

  for (const tie of project.overview.tieLines) {
    const fromPort = findPort(project, tie.fromPortId)
    const toPort = findPort(project, tie.toPortId)
    if (!fromPort || !toPort) continue
    const edgeId = `tie_edge_${tie.id}`
    edges.push({
      id: edgeId,
      source: fromPort.deviceId,
      target: toPort.deviceId,
      name: tie.name,
    })
    tieEdgeIds.set(edgeId, tie.id)
  }

  return { graph: { nodes, edges }, nodeStation, tieEdgeIds }
}

export function analyzeImpactCrossStation(
  project: GridProject,
  faultStationId: string,
  faultNodeId: string,
): CrossStationImpactResult {
  const { graph, nodeStation, tieEdgeIds } = buildUnionGraph(project)
  const base = analyzeImpact(graph, faultNodeId)

  const island = new Set(base.affectedIsland)
  const affectedStations = new Set<string>()
  for (const id of island) {
    const sid = nodeStation.get(id)
    if (sid) affectedStations.add(sid)
  }

  const affectedTieLines: string[] = []
  for (const [edgeId, tieId] of tieEdgeIds) {
    const edge = graph.edges.find((e) => e.id === edgeId)
    if (!edge) continue
    if (island.has(edge.source) && island.has(edge.target)) {
      affectedTieLines.push(tieId)
    }
  }

  const remoteHighlights: Record<string, string[]> = {}
  for (const id of island) {
    const sid = nodeStation.get(id)
    if (!sid) continue
    if (!remoteHighlights[sid]) remoteHighlights[sid] = []
    remoteHighlights[sid].push(id)
  }

  return {
    ...base,
    faultStationId,
    affectedStations: [...affectedStations],
    affectedTieLines,
    remoteHighlights,
  }
}
