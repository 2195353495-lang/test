export type DeviceType =
  | 'bus'
  | 'breaker'
  | 'disconnector'
  | 'transformer'
  | 'line'
  | 'load'
  | 'powerSource'
  | 'station'

export interface TopologyNode {
  id: string
  type: DeviceType
  name: string
  voltage?: string
  stationId?: string
  /** 合=true 导通；分=false 阻断。仅 breaker/disconnector 有效 */
  closed?: boolean
  isPowerSource?: boolean
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

export interface ImpactAnalysisResult {
  affectedIsland: string[]
  sourceSide: string[]
  loadSide: string[]
  blockedBy: string[]
  faultNodeId: string
  powerSourceIds: string[]
}

export type InteractionMode =
  | 'select'
  | 'connect'
  | 'setPower'
  | 'setFault'
  | 'toggleSwitch'
