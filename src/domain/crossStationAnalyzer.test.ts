import { describe, expect, it } from 'vitest'
import { analyzeImpactCrossStation, buildUnionGraph } from './crossStationAnalyzer'
import { createSampleProject } from './sampleProject'
import type { GridProject } from './types'

function openBreaker(project: GridProject, stationId: string, deviceId: string) {
  const st = project.stations[stationId]
  const node = st.graph.nodes.find((n) => n.id === deviceId)
  if (node) node.closed = false
}

describe('buildUnionGraph', () => {
  it('包含三站节点与两条联络边', () => {
    const project = createSampleProject()
    const { graph, tieEdgeIds } = buildUnionGraph(project)
    expect(graph.nodes.some((n) => n.id === 'a_power')).toBe(true)
    expect(graph.nodes.some((n) => n.id === 'c_load')).toBe(true)
    expect(tieEdgeIds.size).toBe(2)
  })
})

describe('analyzeImpactCrossStation', () => {
  it('全合位时 B 母线故障可影响 A 与 C', () => {
    const project = createSampleProject()
    const result = analyzeImpactCrossStation(project, 'stB', 'b_bus1')
    expect(result.affectedStations).toEqual(
      expect.arrayContaining(['stA', 'stB', 'stC']),
    )
    expect(result.affectedTieLines).toEqual(
      expect.arrayContaining(['tie_ab', 'tie_bc']),
    )
    expect(result.remoteHighlights.stA).toContain('a_power')
    expect(result.remoteHighlights.stC).toContain('c_load')
    expect(result.sourceSide).toContain('a_power')
  })

  it('拉开 A 出线开关后，B 故障不再影响 A 电源侧设备', () => {
    const project = createSampleProject()
    openBreaker(project, 'stA', 'a_br_out')
    const result = analyzeImpactCrossStation(project, 'stB', 'b_bus1')
    // 边界刀闸仍可能经联络线带电，但电源/母线被出线开关隔离
    expect(result.affectedIsland).not.toContain('a_power')
    expect(result.affectedIsland).not.toContain('a_bus')
    expect(result.affectedStations).toContain('stB')
    expect(result.affectedStations).toContain('stC')
  })

  it('拉开 B 出线开关后，B 故障不再影响 C', () => {
    const project = createSampleProject()
    openBreaker(project, 'stB', 'b_br_out')
    const result = analyzeImpactCrossStation(project, 'stB', 'b_bus1')
    expect(result.affectedStations).toContain('stA')
    expect(result.affectedStations).toContain('stB')
    expect(result.affectedStations).not.toContain('stC')
    expect(result.remoteHighlights.stC).toBeUndefined()
  })

  it('跳转上下文 remoteHighlights 按站分组', () => {
    const project = createSampleProject()
    const result = analyzeImpactCrossStation(project, 'stA', 'a_bus')
    expect(result.faultStationId).toBe('stA')
    expect(Object.keys(result.remoteHighlights).length).toBeGreaterThanOrEqual(2)
    for (const [sid, ids] of Object.entries(result.remoteHighlights)) {
      expect(ids.length).toBeGreaterThan(0)
      expect(project.stations[sid]).toBeDefined()
    }
  })
})
