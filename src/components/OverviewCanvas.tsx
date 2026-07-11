import { useEffect, useRef } from 'react'
import { Graph, Shape } from '@antv/x6'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Selection } from '@antv/x6-plugin-selection'
import type { GridProject, OverviewMode, TieLine } from '../domain/types'
import { colorForVoltage } from '../domain/symbols'
import { validateTieLine } from '../domain/projectStore'

interface Props {
  project: GridProject
  mode: OverviewMode
  onEnterStation: (stationId: string) => void
  onProjectChange: (project: GridProject) => void
  highlightedTieIds?: string[]
}

const STATION_W = 140
const STATION_H = 72

const registeredOverview = { done: false }

function registerOverviewShapes() {
  if (registeredOverview.done) return
  Graph.registerNode(
    'overview-station',
    {
      inherit: 'rect',
      width: STATION_W,
      height: STATION_H,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' },
        { tagName: 'text', selector: 'sub' },
      ],
      attrs: {
        body: {
          fill: '#0f2436',
          stroke: '#5c7a99',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          refWidth: '100%',
          refHeight: '100%',
        },
        label: {
          refX: '50%',
          refY: '38%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: '#9ec5e8',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'Noto Sans SC, Microsoft YaHei, sans-serif',
        },
        sub: {
          refX: '50%',
          refY: '68%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fill: '#7f97ad',
          fontSize: 11,
          fontFamily: 'Noto Sans SC, Microsoft YaHei, sans-serif',
        },
      },
      ports: {
        groups: {
          center: {
            position: { name: 'absolute', args: { x: '50%', y: '50%' } },
            attrs: {
              circle: {
                r: 4,
                magnet: true,
                stroke: '#5b8ff9',
                fill: '#fff',
                style: { visibility: 'hidden' },
              },
            },
          },
        },
        items: [{ id: 'port', group: 'center' }],
      },
    } as never,
    true,
  )
  registeredOverview.done = true
}

export function OverviewCanvas({
  project,
  mode,
  onEnterStation,
  onProjectChange,
  highlightedTieIds = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const modeRef = useRef(mode)
  const projectRef = useRef(project)
  const connectFromRef = useRef<string | null>(null)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    projectRef.current = project
  }, [project])

  useEffect(() => {
    if (!containerRef.current) return
    registerOverviewShapes()

    const graph = new Graph({
      container: containerRef.current,
      background: { color: '#071421' },
      grid: {
        visible: true,
        type: 'doubleMesh',
        args: [
          { color: '#122536', thickness: 1 },
          { color: '#183247', thickness: 1, factor: 5 },
        ],
      },
      panning: { enabled: true, eventTypes: ['rightMouseDown', 'mouseWheel'] },
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
      interacting: {
        nodeMovable: () => modeRef.current === 'moveStation',
      },
    })

    graph.use(new Snapline({ enabled: true }))
    graph.use(
      new Selection({
        enabled: true,
        multiple: false,
        rubberband: false,
        showNodeSelectionBox: true,
      }),
    )

    const reload = (proj: GridProject) => {
      graph.clearCells()
      for (const st of Object.values(proj.stations)) {
        graph.addNode({
          id: st.id,
          shape: 'overview-station',
          x: st.overviewPosition.x,
          y: st.overviewPosition.y,
          width: STATION_W,
          height: STATION_H,
          attrs: {
            label: { text: st.name },
            sub: { text: `${st.voltageSummary} · ${st.busScheme}` },
          },
          data: { stationId: st.id },
        })
      }
      for (const tie of proj.overview.tieLines) {
        const stroke = colorForVoltage(tie.voltage)
        const hi = highlightedTieIds.includes(tie.id)
        graph.addEdge({
          id: tie.id,
          source: { cell: tie.fromStationId, port: 'port' },
          target: { cell: tie.toStationId, port: 'port' },
          attrs: {
            line: {
              stroke: hi ? '#ffa940' : stroke,
              strokeWidth: hi ? 4 : 3,
              targetMarker: null,
            },
          },
          labels: [
            {
              attrs: {
                label: {
                  text: tie.name,
                  fill: hi ? '#ffa940' : stroke,
                  fontSize: 11,
                },
                rect: { fill: '#0b1e2e', stroke: 'transparent' },
              },
            },
          ],
          data: { tieLineId: tie.id },
          router: { name: 'orth', args: { padding: 12 } },
          connector: { name: 'rounded', args: { radius: 4 } },
        })
      }
    }

    reload(projectRef.current)
    graphRef.current = graph

    graph.on('node:click', ({ node, e }) => {
      const m = modeRef.current
      const stationId = String(node.getData()?.stationId ?? node.id)

      if (m === 'select') {
        e.stopPropagation()
        onEnterStation(stationId)
        return
      }

      if (m === 'addTieLine') {
        e.stopPropagation()
        const from = connectFromRef.current
        if (!from) {
          connectFromRef.current = stationId
          node.attr('body/stroke', '#40a9ff')
          return
        }
        if (from === stationId) {
          connectFromRef.current = null
          node.attr('body/stroke', '#5c7a99')
          return
        }
        const proj = projectRef.current
        const fromSt = proj.stations[from]
        const toSt = proj.stations[stationId]
        const fromPort = fromSt?.ports[0]
        const toPort = toSt?.ports[0]
        if (!fromPort || !toPort) {
          window.alert('两端站需要至少各有一个边界端口')
          connectFromRef.current = null
          return
        }

        // 若有多个端口，用 prompt 选择
        const pickPort = (stId: string, label: string) => {
          const ports = proj.stations[stId].ports
          if (ports.length === 1) return ports[0].id
          const lines = ports.map((p, i) => `${i + 1}. ${p.name ?? p.id}`).join('\n')
          const ans = window.prompt(`${label}选择边界端口序号:\n${lines}`, '1')
          const idx = Number(ans) - 1
          if (!Number.isFinite(idx) || !ports[idx]) return null
          return ports[idx].id
        }

        const fromPortId = pickPort(from, '起始站')
        const toPortId = pickPort(stationId, '终止站')
        connectFromRef.current = null
        if (!fromPortId || !toPortId) return

        const name =
          window.prompt('联络线名称', `${fromSt.name}-${toSt.name}线`) ??
          `${from}-${stationId}`
        const tie: TieLine = {
          id: `tie_${Date.now()}`,
          name,
          voltage: '220kV',
          fromStationId: from,
          toStationId: stationId,
          fromPortId,
          toPortId,
        }
        const err = validateTieLine(proj, tie)
        if (err) {
          window.alert(err)
          return
        }
        const next: GridProject = {
          ...proj,
          overview: {
            tieLines: [...proj.overview.tieLines, tie],
          },
        }
        onProjectChange(next)
      }
    })

    graph.on('node:moved', ({ node }) => {
      const proj = projectRef.current
      const stationId = String(node.getData()?.stationId ?? node.id)
      const st = proj.stations[stationId]
      if (!st) return
      const pos = node.position()
      const next: GridProject = {
        ...proj,
        stations: {
          ...proj.stations,
          [stationId]: {
            ...st,
            overviewPosition: { x: pos.x, y: pos.y },
          },
        },
      }
      onProjectChange(next)
    })

    graph.bindKey(['backspace', 'delete'], () => {
      if (modeRef.current !== 'select' && modeRef.current !== 'addTieLine') return
      const cells = graph.getSelectedCells()
      const edges = cells.filter((c) => c.isEdge())
      if (!edges.length) return
      const proj = projectRef.current
      const removeIds = new Set(edges.map((e) => e.id))
      const next: GridProject = {
        ...proj,
        overview: {
          tieLines: proj.overview.tieLines.filter((t) => !removeIds.has(t.id)),
        },
      }
      onProjectChange(next)
    })

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      graph.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      graph.dispose()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  // Reload when project / highlights change
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const selected = graph.getSelectedCells().map((c) => c.id)
    graph.clearCells()
    for (const st of Object.values(project.stations)) {
      graph.addNode({
        id: st.id,
        shape: 'overview-station',
        x: st.overviewPosition.x,
        y: st.overviewPosition.y,
        width: STATION_W,
        height: STATION_H,
        attrs: {
          label: { text: st.name },
          sub: { text: `${st.voltageSummary} · ${st.busScheme}` },
        },
        data: { stationId: st.id },
      })
    }
    for (const tie of project.overview.tieLines) {
      const stroke = colorForVoltage(tie.voltage)
      const hi = highlightedTieIds.includes(tie.id)
      graph.addEdge({
        id: tie.id,
        source: { cell: tie.fromStationId, port: 'port' },
        target: { cell: tie.toStationId, port: 'port' },
        attrs: {
          line: {
            stroke: hi ? '#ffa940' : stroke,
            strokeWidth: hi ? 4 : 3,
            targetMarker: null,
          },
        },
        labels: [
          {
            attrs: {
              label: {
                text: tie.name,
                fill: hi ? '#ffa940' : stroke,
                fontSize: 11,
              },
              rect: { fill: '#0b1e2e', stroke: 'transparent' },
            },
          },
        ],
        data: { tieLineId: tie.id },
        router: { name: 'orth', args: { padding: 12 } },
        connector: { name: 'rounded', args: { radius: 4 } },
      })
    }
    for (const id of selected) {
      const cell = graph.getCellById(id)
      if (cell) graph.select(cell)
    }
  }, [project, highlightedTieIds])

  void Shape
  return <div className="canvas-host" ref={containerRef} />
}
