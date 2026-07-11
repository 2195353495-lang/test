export type DeviceType =
  | 'bus'
  | 'breaker'
  | 'disconnector'
  | 'transformer'
  | 'line'
  | 'load'
  | 'powerSource'
  | 'station'

export type BusScheme = 'single' | 'double' | 'bridge'

export interface TopologyNode {
  id: string
  type: DeviceType
  name: string
  voltage?: string
  stationId?: string
  /** 合=true 导通；分=false 阻断。仅 breaker/disconnector 有效 */
  closed?: boolean
  isPowerSource?: boolean
  /** 出线边界设备，可被总览联络线绑定 */
  isBoundary?: boolean
  x: number
  y: number
  width?: number
  height?: number
}

export interface TopologyEdge {
  id: string
  source: string
  target: string
  name?: string
}

export interface TopologyGraph {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

export interface BoundaryPort {
  id: string
  stationId: string
  deviceId: string
  name?: string
}

export interface StationDoc {
  id: string
  name: string
  voltageSummary: string
  busScheme: BusScheme
  graph: TopologyGraph
  ports: BoundaryPort[]
  overviewPosition: { x: number; y: number }
}

export interface TieLine {
  id: string
  name: string
  voltage?: string
  fromStationId: string
  toStationId: string
  fromPortId: string
  toPortId: string
}

export interface OverviewDoc {
  tieLines: TieLine[]
}

export interface GridProject {
  version: 1
  overview: OverviewDoc
  stations: Record<string, StationDoc>
}

export interface ImpactAnalysisResult {
  affectedIsland: string[]
  sourceSide: string[]
  loadSide: string[]
  blockedBy: string[]
  faultNodeId: string
  powerSourceIds: string[]
}

export interface CrossStationImpactResult extends ImpactAnalysisResult {
  faultStationId: string
  affectedStations: string[]
  affectedTieLines: string[]
  /** stationId -> node ids in that station */
  remoteHighlights: Record<string, string[]>
}

export interface HighlightContext {
  faultStationId: string
  faultNodeId: string
  sourceSide: string[]
  loadSide: string[]
  remoteHighlights: Record<string, string[]>
  affectedTieLines: string[]
}

export type AppView = 'overview' | 'station'

export type InteractionMode =
  | 'select'
  | 'connect'
  | 'setPower'
  | 'setFault'
  | 'toggleSwitch'
  | 'moveStation'
  | 'addTieLine'

export type OverviewMode = 'select' | 'moveStation' | 'addTieLine'
