import { describe, expect, it } from 'vitest'
import { analyzeImpact, buildConductingAdjacency, shortestPath } from './connectivityAnalyzer'
import type { TopologyGraph } from './types'

/**
 * 简化链式拓扑：
 * Power -- BusA -- Breaker1 -- LineMid -- Breaker2 -- BusB -- Load
 */
function linearGraph(breaker1Closed = true, breaker2Closed = true): TopologyGraph {
  return {
    nodes: [
      { id: 'power', type: 'powerSource', name: '电源', isPowerSource: true, x: 0, y: 0 },
      { id: 'busA', type: 'bus', name: '母线A', x: 100, y: 0 },
      { id: 'br1', type: 'breaker', name: '断路器1', closed: breaker1Closed, x: 200, y: 0 },
      { id: 'mid', type: 'bus', name: '中间节点', x: 300, y: 0 },
      { id: 'br2', type: 'breaker', name: '断路器2', closed: breaker2Closed, x: 400, y: 0 },
      { id: 'busB', type: 'bus', name: '母线B', x: 500, y: 0 },
      { id: 'load', type: 'load', name: '负荷', x: 600, y: 0 },
    ],
    edges: [
      { id: 'e1', source: 'power', target: 'busA' },
      { id: 'e2', source: 'busA', target: 'br1' },
      { id: 'e3', source: 'br1', target: 'mid' },
      { id: 'e4', source: 'mid', target: 'br2' },
      { id: 'e5', source: 'br2', target: 'busB' },
      { id: 'e6', source: 'busB', target: 'load' },
    ],
  }
}

describe('buildConductingAdjacency', () => {
  it('全合位时全链连通', () => {
    const adj = buildConductingAdjacency(linearGraph(true, true))
    expect(adj.get('power')?.has('busA')).toBe(true)
    expect(adj.get('br1')?.has('mid')).toBe(true)
    expect(adj.get('busB')?.has('load')).toBe(true)
  })

  it('分位断路器阻断两侧连接', () => {
    const adj = buildConductingAdjacency(linearGraph(false, true))
    expect(adj.get('busA')?.has('br1')).toBe(false)
    expect(adj.get('br1')?.has('mid')).toBe(false)
    expect(adj.get('mid')?.has('br2')).toBe(true)
  })
})

describe('shortestPath', () => {
  it('返回电源到负荷的路径', () => {
    const adj = buildConductingAdjacency(linearGraph())
    const path = shortestPath(adj, 'power', 'load')
    expect(path).toEqual(['power', 'busA', 'br1', 'mid', 'br2', 'busB', 'load'])
  })

  it('分闸后无法到达', () => {
    const adj = buildConductingAdjacency(linearGraph(false, true))
    expect(shortestPath(adj, 'power', 'load')).toBeNull()
  })
})

describe('analyzeImpact', () => {
  it('全合位故障在中间：电源侧含电源路径，负荷侧含负荷', () => {
    const result = analyzeImpact(linearGraph(), 'mid')
    expect(result.affectedIsland).toContain('power')
    expect(result.affectedIsland).toContain('load')
    expect(result.sourceSide).toContain('power')
    expect(result.sourceSide).toContain('busA')
    expect(result.sourceSide).toContain('br1')
    expect(result.sourceSide).toContain('mid')
    expect(result.loadSide).toContain('load')
    expect(result.loadSide).toContain('busB')
  })

  it('拉开 br1 后，电源侧故障不影响负荷侧', () => {
    const result = analyzeImpact(linearGraph(false, true), 'busA')
    expect(result.affectedIsland).toContain('power')
    expect(result.affectedIsland).toContain('busA')
    expect(result.affectedIsland).not.toContain('mid')
    expect(result.affectedIsland).not.toContain('load')
    expect(result.blockedBy).toContain('br1')
  })

  it('拉开 br1 后，负荷侧故障不影响电源', () => {
    const result = analyzeImpact(linearGraph(false, true), 'load')
    expect(result.affectedIsland).toContain('load')
    expect(result.affectedIsland).toContain('mid')
    expect(result.affectedIsland).not.toContain('power')
    expect(result.affectedIsland).not.toContain('busA')
    expect(result.sourceSide).toHaveLength(0)
    expect(result.loadSide).toContain('load')
  })

  it('切换故障点结果随之变化', () => {
    const graph = linearGraph()
    const atLoad = analyzeImpact(graph, 'load')
    const atPower = analyzeImpact(graph, 'power')
    expect(atLoad.sourceSide).toContain('load')
    expect(atPower.loadSide.length).toBeGreaterThan(0)
    expect(atPower.sourceSide).toEqual(['power'])
  })
})
