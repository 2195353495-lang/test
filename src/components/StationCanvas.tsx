import { useCallback, useEffect, useRef } from 'react'
import { Graph, Shape } from '@antv/x6'
import type { Node } from '@antv/x6'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Selection } from '@antv/x6-plugin-selection'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import type {
  CrossStationImpactResult,
  GridProject,
  HighlightContext,
  InteractionMode,
  StationDoc,
} from '../domain/types'
import { analyzeImpactCrossStation } from '../domain/crossStationAnalyzer'
import { removeDeviceWithCascade, syncPortsFromGraph } from '../domain/projectStore'
import { SYMBOL_LIBRARY } from '../domain/symbols'
import {
  applyImpactHighlight,
  exportGraphFromX6,
  loadGraphIntoX6,
  nodeToX6Config,
  refreshSwitchVisual,
  registerPowerShapes,
} from '../domain/graphBridge'

interface Props {
  project: GridProject
  stationId: string
  mode: InteractionMode
  faultId: string | null
  onFaultChange: (id: string | null) => void
  onResult: (result: CrossStationImpactResult | null) => void
  onProjectChange: (project: GridProject) => void
  pendingAdd: { type: string; name: string; isBoundary?: boolean } | null
  onPendingConsumed: () => void
  analyzeToken: number
  clearToken: number
  highlightContext: HighlightContext | null
}

let idSeq = 1
function nextId(prefix: string) {
  idSeq += 1
  return `${prefix}_${Date.now()}_${idSeq}`
}

export function StationCanvas({
  project,
  stationId,
  mode,
  faultId,
  onFaultChange,
  onResult,
  onProjectChange,
  pendingAdd,
  onPendingConsumed,
  analyzeToken,
  clearToken,
  highlightContext,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const connectSourceRef = useRef<string | null>(null)
  const modeRef = useRef(mode)
  const faultRef = useRef(faultId)
  const projectRef = useRef(project)
  const stationIdRef = useRef(stationId)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    faultRef.current = faultId
  }, [faultId])
  useEffect(() => {
    projectRef.current = project
  }, [project])
  useEffect(() => {
    stationIdRef.current = stationId
  }, [stationId])

  const pushStationGraph = useCallback(
    (graphData: ReturnType<typeof exportGraphFromX6>) => {
      const proj = projectRef.current
      const sid = stationIdRef.current
      const prev = proj.stations[sid]
      if (!prev) return
      let nextStation: StationDoc = syncPortsFromGraph({
        ...prev,
        graph: graphData,
      })
      // mark boundary from node flags
      nextStation = {
        ...nextStation,
        graph: {
          ...nextStation.graph,
          nodes: nextStation.graph.nodes.map((n) => ({
            ...n,
            stationId: sid,
          })),
        },
      }
      onProjectChange({
        ...proj,
        stations: { ...proj.stations, [sid]: nextStation },
      })
    },
    [onProjectChange],
  )

  const syncExport = useCallback(() => {
    const g = graphRef.current
    if (!g) return
    pushStationGraph(exportGraphFromX6(g))
  }, [pushStationGraph])

  useEffect(() => {
    if (!containerRef.current) return
    registerPowerShapes()
    const station = projectRef.current.stations[stationIdRef.current]
    if (!station) return

    const graph: Graph = new Graph({
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
      connecting: {
        allowBlank: false,
        allowLoop: false,
        allowNode: true,
        allowEdge: false,
        snap: true,
        router: { name: 'orth', args: { padding: 8 } },
        connector: { name: 'rounded', args: { radius: 2 } },
        createEdge() {
          return new Shape.Edge({
            attrs: {
              line: {
                stroke: '#c039c6',
                strokeWidth: 2,
                targetMarker: null,
              },
            },
            router: { name: 'orth', args: { padding: 8 } },
            connector: { name: 'rounded', args: { radius: 2 } },
          })
        },
      },
    })

    graph.use(new Snapline({ enabled: true }))
    graph.use(
      new Selection({
        enabled: true,
        multiple: true,
        rubberband: true,
        modifiers: ['shift'],
        showNodeSelectionBox: true,
        pointerEvents: 'none',
      }),
    )
    graph.use(new Keyboard({ enabled: true }))

    graph.bindKey(['backspace', 'delete'], () => {
      const cells = graph.getSelectedCells()
      if (!cells.length) return
      let proj = projectRef.current
      const sid = stationIdRef.current
      for (const cell of cells) {
        if (cell.isNode()) {
          proj = removeDeviceWithCascade(proj, sid, cell.id)
        }
      }
      // remove edges from current graph export after cascade
      const st = proj.stations[sid]
      if (st) {
        const edgeIds = new Set(
          cells.filter((c) => c.isEdge()).map((c) => c.id),
        )
        if (edgeIds.size) {
          st.graph.edges = st.graph.edges.filter((e) => !edgeIds.has(e.id))
          proj = {
            ...proj,
            stations: { ...proj.stations, [sid]: st },
          }
        }
      }
      onProjectChange(proj)
      loadGraphIntoX6(graph, proj.stations[sid].graph)
    })

    graph.on('node:click', ({ node, e }: { node: Node; e: MouseEvent }) => {
      const m = modeRef.current
      const data = (node.getData() ?? {}) as Record<string, unknown>
      const type = data.type as string

      if (m === 'toggleSwitch' && (type === 'breaker' || type === 'disconnector')) {
        e.stopPropagation()
        const closed = data.closed !== false
        refreshSwitchVisual(graph, node.id, !closed)
        syncExport()
        return
      }
      if (m === 'setPower') {
        e.stopPropagation()
        const next = type === 'powerSource' ? true : !data.isPowerSource
        node.setData({ ...data, isPowerSource: next })
        syncExport()
        return
      }
      if (m === 'setFault') {
        e.stopPropagation()
        onFaultChange(node.id)
        return
      }
      if (m === 'connect') {
        e.stopPropagation()
        const src = connectSourceRef.current
        if (!src) {
          connectSourceRef.current = node.id
          return
        }
        if (src === node.id) {
          connectSourceRef.current = null
          return
        }
        graph.addEdge({
          id: nextId('edge'),
          source: { cell: src, port: 'bottom' },
          target: { cell: node.id, port: 'top' },
          attrs: {
            line: { stroke: '#c039c6', strokeWidth: 2, targetMarker: null },
          },
          router: { name: 'orth', args: { padding: 8 } },
          connector: { name: 'rounded', args: { radius: 2 } },
        })
        connectSourceRef.current = null
        syncExport()
      }
    })

    graph.on('node:dblclick', ({ node }: { node: Node }) => {
      const data = (node.getData() ?? {}) as Record<string, unknown>
      const name = window.prompt('设备名称', String(data.name ?? ''))
      if (name == null) return
      const boundaryAns = window.prompt(
        '是否作为边界端口（供总览联络线绑定）？输入 1=是，0=否',
        data.isBoundary ? '1' : '0',
      )
      const isBoundary = boundaryAns === '1'
      node.setData({ ...data, name, isBoundary })
      node.attr('label/text', name)
      syncExport()
    })

    graph.on('node:moved', () => syncExport())
    graph.on('edge:connected', () => syncExport())

    loadGraphIntoX6(graph, station.graph)
    graphRef.current = graph

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
  }, [stationId, onFaultChange, onProjectChange, syncExport])

  // Reload graph when station doc identity changes externally (e.g. import)
  useEffect(() => {
    const g = graphRef.current
    const st = project.stations[stationId]
    if (!g || !st) return
    // Avoid clobbering during local edits: only reload if node count/id set differs
    const currentIds = new Set(g.getNodes().map((n) => n.id))
    const nextIds = new Set(st.graph.nodes.map((n) => n.id))
    const same =
      currentIds.size === nextIds.size && [...currentIds].every((id) => nextIds.has(id))
    if (!same) {
      loadGraphIntoX6(g, st.graph)
    }
  }, [project, stationId])

  useEffect(() => {
    if (!pendingAdd || !graphRef.current) return
    const def = SYMBOL_LIBRARY.find((s) => s.type === pendingAdd.type)
    if (!def) return
    const id = nextId(def.type)
    const node = {
      id,
      type: def.type,
      name: pendingAdd.name || def.defaultName,
      voltage: def.defaultVoltage,
      stationId,
      closed: def.switchable ? true : undefined,
      isPowerSource: def.type === 'powerSource',
      isBoundary: Boolean(pendingAdd.isBoundary),
      x: 120 + Math.random() * 80,
      y: 120 + Math.random() * 80,
      width: def.width,
      height: def.height,
    }
    graphRef.current.addNode(nodeToX6Config(node))
    onPendingConsumed()
    syncExport()
  }, [pendingAdd, onPendingConsumed, syncExport, stationId])

  useEffect(() => {
    if (!analyzeToken || !graphRef.current) return
    const fault = faultRef.current
    if (!fault) {
      onResult(null)
      window.alert('请先用「设故障点」模式点击一个设备')
      return
    }
    // sync latest graph first
    const graphData = exportGraphFromX6(graphRef.current)
    const proj = {
      ...projectRef.current,
      stations: {
        ...projectRef.current.stations,
        [stationIdRef.current]: syncPortsFromGraph({
          ...projectRef.current.stations[stationIdRef.current],
          graph: graphData,
        }),
      },
    }
    const result = analyzeImpactCrossStation(proj, stationIdRef.current, fault)
    onResult(result)
    const localIds = new Set(graphData.nodes.map((n) => n.id))
    applyImpactHighlight(graphRef.current, {
      faultId: fault,
      sourceSide: new Set(result.sourceSide.filter((id) => localIds.has(id))),
      loadSide: new Set(result.loadSide.filter((id) => localIds.has(id))),
      openSwitches: new Set(
        graphData.nodes
          .filter(
            (n) =>
              (n.type === 'breaker' || n.type === 'disconnector') && n.closed === false,
          )
          .map((n) => n.id),
      ),
    })
  }, [analyzeToken, onResult])

  useEffect(() => {
    if (!clearToken || !graphRef.current) return
    onResult(null)
    applyImpactHighlight(graphRef.current, {
      faultId: null,
      sourceSide: new Set(),
      loadSide: new Set(),
      openSwitches: new Set(),
    })
  }, [clearToken, onResult])

  useEffect(() => {
    const g = graphRef.current
    if (!g || !highlightContext) return
    const ids = highlightContext.remoteHighlights[stationId] ?? []
    const idSet = new Set(ids)
    const sourceSide = new Set(
      highlightContext.sourceSide.filter((id) => idSet.has(id)),
    )
    const loadSide = new Set(highlightContext.loadSide.filter((id) => idSet.has(id)))
    applyImpactHighlight(g, {
      faultId:
        highlightContext.faultStationId === stationId
          ? highlightContext.faultNodeId
          : null,
      sourceSide,
      loadSide,
      openSwitches: new Set(),
    })
  }, [highlightContext, stationId])

  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    for (const node of g.getNodes()) {
      if (node.id === faultId) {
        node.attr('label/fill', '#ff4d4f')
        node.attr('label/fontWeight', 700)
      } else {
        node.attr('label/fill', '#a8bdd0')
        node.attr('label/fontWeight', 400)
      }
    }
  }, [faultId])

  return <div className="canvas-host" ref={containerRef} />
}
