import { useCallback, useEffect, useRef } from 'react'
import { Graph, Shape } from '@antv/x6'
import type { Node } from '@antv/x6'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Selection } from '@antv/x6-plugin-selection'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import type { ImpactAnalysisResult, InteractionMode, TopologyGraph } from '../domain/types'
import { analyzeImpact } from '../domain/connectivityAnalyzer'
import { sampleThreeStationGraph } from '../domain/sampleGraph'
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
  mode: InteractionMode
  faultId: string | null
  onFaultChange: (id: string | null) => void
  onResult: (result: ImpactAnalysisResult | null) => void
  onGraphChange: (graph: TopologyGraph) => void
  pendingAdd: { type: string; name: string } | null
  onPendingConsumed: () => void
  analyzeToken: number
  clearToken: number
  loadToken: number
  loadData: TopologyGraph | null
}

let idSeq = 1
function nextId(prefix: string) {
  idSeq += 1
  return `${prefix}_${Date.now()}_${idSeq}`
}

export function TopologyCanvas({
  mode,
  faultId,
  onFaultChange,
  onResult,
  onGraphChange,
  pendingAdd,
  onPendingConsumed,
  analyzeToken,
  clearToken,
  loadToken,
  loadData,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const connectSourceRef = useRef<string | null>(null)
  const modeRef = useRef(mode)
  const faultRef = useRef(faultId)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    faultRef.current = faultId
  }, [faultId])

  const syncExport = useCallback(() => {
    const g = graphRef.current
    if (!g) return
    onGraphChange(exportGraphFromX6(g))
  }, [onGraphChange])

  useEffect(() => {
    if (!containerRef.current) return
    registerPowerShapes()

    const graph: Graph = new Graph({
      container: containerRef.current,
      grid: { visible: true, type: 'dot', args: { color: '#d5d8dc', thickness: 1 } },
      panning: { enabled: true, eventTypes: ['rightMouseDown', 'mouseWheel'] },
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
      connecting: {
        allowBlank: false,
        allowLoop: false,
        allowNode: true,
        allowEdge: false,
        snap: true,
        connector: 'normal',
        createEdge() {
          return new Shape.Edge({
            attrs: {
              line: {
                stroke: '#566573',
                strokeWidth: 2,
                targetMarker: null,
              },
            },
          })
        },
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#5b8ff9', strokeWidth: 3 } },
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
      if (cells.length) {
        graph.removeCells(cells)
        syncExport()
      }
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
        const next = !data.isPowerSource
        node.setData({ ...data, isPowerSource: type === 'powerSource' ? true : next })
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
          source: { cell: src, port: 'port' },
          target: { cell: node.id, port: 'port' },
          attrs: {
            line: { stroke: '#566573', strokeWidth: 2, targetMarker: null },
          },
        })
        connectSourceRef.current = null
        syncExport()
      }
    })

    graph.on('node:dblclick', ({ node }: { node: Node }) => {
      const data = (node.getData() ?? {}) as Record<string, unknown>
      const name = window.prompt('设备名称', String(data.name ?? ''))
      if (name == null) return
      node.setData({ ...data, name })
      node.attr('label/text', name)
      syncExport()
    })

    graph.on('node:moved', () => syncExport())
    graph.on('edge:connected', () => syncExport())

    loadGraphIntoX6(graph, sampleThreeStationGraph)
    graphRef.current = graph
    onGraphChange(exportGraphFromX6(graph))

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      graph.resize(clientWidth, clientHeight)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      graph.dispose()
      graphRef.current = null
    }
  }, [onFaultChange, onGraphChange, syncExport])

  useEffect(() => {
    if (!pendingAdd || !graphRef.current) return
    const def = SYMBOL_LIBRARY.find((s) => s.type === pendingAdd.type)
    if (!def) return
    const id = nextId(def.type)
    const node = {
      id,
      type: def.type,
      name: pendingAdd.name || def.defaultName,
      closed: def.switchable ? true : undefined,
      isPowerSource: def.type === 'powerSource',
      x: 120 + Math.random() * 80,
      y: 120 + Math.random() * 80,
      width: def.width,
      height: def.height,
    }
    graphRef.current.addNode(nodeToX6Config(node))
    onPendingConsumed()
    syncExport()
  }, [pendingAdd, onPendingConsumed, syncExport])

  useEffect(() => {
    if (!analyzeToken || !graphRef.current) return
    const data = exportGraphFromX6(graphRef.current)
    const fault = faultRef.current
    if (!fault) {
      onResult(null)
      window.alert('请先用「设故障点」模式点击一个设备')
      return
    }
    const result = analyzeImpact(data, fault)
    onResult(result)
    applyImpactHighlight(graphRef.current, {
      faultId: fault,
      sourceSide: new Set(result.sourceSide),
      loadSide: new Set(result.loadSide),
      openSwitches: new Set(
        data.nodes
          .filter((n) => (n.type === 'breaker' || n.type === 'disconnector') && n.closed === false)
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
    if (!loadToken || !loadData || !graphRef.current) return
    loadGraphIntoX6(graphRef.current, loadData)
    onGraphChange(loadData)
    onResult(null)
  }, [loadToken, loadData, onGraphChange, onResult])

  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    for (const node of g.getNodes()) {
      if (node.id === faultId) {
        node.attr('label/fill', '#c0392b')
        node.attr('label/fontWeight', 700)
      } else {
        node.attr('label/fill', '#34495e')
        node.attr('label/fontWeight', 400)
      }
    }
  }, [faultId])

  return <div className="canvas-host" ref={containerRef} />
}
