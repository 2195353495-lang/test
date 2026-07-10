import { Graph } from '@antv/x6'
import type { TopologyGraph, TopologyNode, DeviceType } from './types'
import { HIGHLIGHT, SYMBOL_LIBRARY } from './symbols'

const SWITCHABLE = new Set(['breaker', 'disconnector'])
const registered = new Set<string>()

function sizeFor(type: DeviceType, node?: TopologyNode) {
  const def = SYMBOL_LIBRARY.find((s) => s.type === type)
  return {
    width: node?.width ?? def?.width ?? 48,
    height: node?.height ?? def?.height ?? 48,
  }
}

function markupFor(type: DeviceType, closed?: boolean): {
  markup: Array<{ tagName: string; selector: string }>
  attrs: Record<string, Record<string, unknown>>
} {
  const open = closed === false
  switch (type) {
    case 'station':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: HIGHLIGHT.stationFill,
            stroke: '#95a5a6',
            strokeWidth: 1.5,
            strokeDasharray: '6 4',
            rx: 4,
            ry: 4,
            refWidth: '100%',
            refHeight: '100%',
          },
          label: {
            refX: 8,
            refY: 10,
            textAnchor: 'start',
            textVerticalAnchor: 'top',
            fontSize: 12,
            fill: '#7f8c8d',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    case 'bus':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: '#1a1a1a',
            stroke: HIGHLIGHT.defaultStroke,
            strokeWidth: 1,
            refWidth: '100%',
            refHeight: '100%',
          },
          label: {
            refX: '50%',
            refY: -10,
            textAnchor: 'middle',
            fontSize: 11,
            fill: '#2c3e50',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    case 'breaker':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'rect', selector: 'symbol' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          symbol: {
            refX: '50%',
            refY: '50%',
            refWidth: 18,
            refHeight: 28,
            xAlign: 'middle',
            yAlign: 'middle',
            fill: open ? '#fff' : '#2c3e50',
            stroke: open ? HIGHLIGHT.openSwitch : HIGHLIGHT.defaultStroke,
            strokeWidth: 2,
            rx: 2,
            ry: 2,
          },
          label: {
            refX: '50%',
            refY: '100%',
            refY2: 4,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            fontSize: 10,
            fill: '#34495e',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    case 'disconnector':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'path', selector: 'symbol' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          symbol: {
            refX: '50%',
            refY: '50%',
            d: open ? 'M -8 8 L 8 -8 M -6 0 L 6 0' : 'M -8 0 L 8 0 M 0 -8 L 0 8',
            stroke: open ? HIGHLIGHT.openSwitch : HIGHLIGHT.defaultStroke,
            strokeWidth: 2.5,
            fill: 'none',
          },
          label: {
            refX: '50%',
            refY: '100%',
            refY2: 4,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            fontSize: 10,
            fill: '#34495e',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    case 'transformer':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'circle', selector: 'c1' },
          { tagName: 'circle', selector: 'c2' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          c1: {
            refCx: '50%',
            refCy: '35%',
            r: 12,
            fill: 'none',
            stroke: HIGHLIGHT.defaultStroke,
            strokeWidth: 2,
          },
          c2: {
            refCx: '50%',
            refCy: '60%',
            r: 12,
            fill: 'none',
            stroke: HIGHLIGHT.defaultStroke,
            strokeWidth: 2,
          },
          label: {
            refX: '50%',
            refY: '100%',
            refY2: 2,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            fontSize: 10,
            fill: '#34495e',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    case 'load':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'path', selector: 'symbol' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          symbol: {
            refX: '50%',
            refY: '45%',
            d: 'M 0 -12 L 10 8 L -10 8 Z',
            fill: '#ecf0f1',
            stroke: HIGHLIGHT.defaultStroke,
            strokeWidth: 2,
          },
          label: {
            refX: '50%',
            refY: '100%',
            refY2: 2,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            fontSize: 10,
            fill: '#34495e',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    case 'powerSource':
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'circle', selector: 'symbol' },
          { tagName: 'text', selector: 'glyph' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          symbol: {
            refCx: '50%',
            refCy: '45%',
            r: 16,
            fill: '#e8f8f0',
            stroke: HIGHLIGHT.power,
            strokeWidth: 2.5,
          },
          glyph: {
            refX: '50%',
            refY: '45%',
            text: 'G',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            fontSize: 14,
            fontWeight: 700,
            fill: HIGHLIGHT.power,
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
          label: {
            refX: '50%',
            refY: '100%',
            refY2: 2,
            textAnchor: 'middle',
            textVerticalAnchor: 'top',
            fontSize: 10,
            fill: '#34495e',
            fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
          },
        },
      }
    default:
      return {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          body: {
            fill: '#fff',
            stroke: HIGHLIGHT.defaultStroke,
            strokeWidth: 1.5,
            refWidth: '100%',
            refHeight: '100%',
          },
          label: {
            refX: '50%',
            refY: '50%',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            fontSize: 11,
            fill: '#2c3e50',
          },
        },
      }
  }
}

export function registerPowerShapes() {
  for (const def of SYMBOL_LIBRARY) {
    const shapeName = `power-${def.type}`
    if (registered.has(shapeName)) continue
    const base = markupFor(def.type, true)
    Graph.registerNode(
      shapeName,
      {
        inherit: 'rect',
        width: def.width,
        height: def.height,
        markup: base.markup,
        attrs: base.attrs as never,
        ports: {
          groups: {
            center: {
              position: { name: 'absolute', args: { x: '50%', y: '50%' } },
              attrs: {
                circle: {
                  r: 4,
                  magnet: true,
                  stroke: '#5b8ff9',
                  strokeWidth: 1,
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
    registered.add(shapeName)
  }
}

export function nodeToX6Config(node: TopologyNode): Record<string, unknown> {
  const { width, height } = sizeFor(node.type, node)
  const visual = markupFor(node.type, node.closed)
  return {
    id: node.id,
    shape: `power-${node.type}`,
    x: node.x,
    y: node.y,
    width,
    height,
    zIndex: node.type === 'station' ? 0 : 10,
    attrs: {
      ...visual.attrs,
      label: {
        ...visual.attrs.label,
        text: node.name,
      },
    },
    data: {
      type: node.type,
      name: node.name,
      voltage: node.voltage,
      stationId: node.stationId,
      closed: node.closed,
      isPowerSource: node.isPowerSource || node.type === 'powerSource',
    },
  }
}

export function loadGraphIntoX6(graph: Graph, data: TopologyGraph) {
  graph.clearCells()
  const stations = data.nodes.filter((n) => n.type === 'station')
  const others = data.nodes.filter((n) => n.type !== 'station')
  for (const n of [...stations, ...others]) {
    graph.addNode(nodeToX6Config(n))
  }

  for (const e of data.edges) {
    graph.addEdge({
      id: e.id,
      source: { cell: e.source, port: 'port' },
      target: { cell: e.target, port: 'port' },
      attrs: {
        line: {
          stroke: '#566573',
          strokeWidth: 2,
          targetMarker: null,
        },
      },
      labels: e.name
        ? [
            {
              attrs: {
                label: {
                  text: e.name,
                  fill: '#7f8c8d',
                  fontSize: 10,
                  fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
                },
              },
            },
          ]
        : [],
      data: { name: e.name },
      zIndex: 5,
      router: { name: 'normal' },
      connector: { name: 'normal' },
    })
  }
}

export function exportGraphFromX6(graph: Graph): TopologyGraph {
  const nodes: TopologyNode[] = graph.getNodes().map((cell) => {
    const data = (cell.getData() ?? {}) as Record<string, unknown>
    const pos = cell.position()
    const size = cell.size()
    const type = (data.type ?? 'bus') as DeviceType
    return {
      id: cell.id,
      type,
      name: String(data.name ?? cell.attr('label/text') ?? cell.id),
      voltage: data.voltage as string | undefined,
      stationId: data.stationId as string | undefined,
      closed: SWITCHABLE.has(type) ? data.closed !== false : undefined,
      isPowerSource: Boolean(data.isPowerSource) || type === 'powerSource',
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
    }
  })

  const edges = graph
    .getEdges()
    .map((edge) => {
      const source = edge.getSourceCellId()
      const target = edge.getTargetCellId()
      return {
        id: edge.id,
        source: source!,
        target: target!,
        name: (edge.getData() as { name?: string } | undefined)?.name,
      }
    })
    .filter((e) => e.source && e.target)

  return { nodes, edges }
}

export function applyImpactHighlight(
  graph: Graph,
  opts: {
    faultId: string | null
    sourceSide: Set<string>
    loadSide: Set<string>
    openSwitches: Set<string>
  },
) {
  for (const node of graph.getNodes()) {
    const id = node.id
    const data = (node.getData() ?? {}) as Record<string, unknown>
    const type = data.type as DeviceType
    let stroke: string = HIGHLIGHT.defaultStroke
    let strokeWidth = 2

    if (opts.openSwitches.has(id) || (SWITCHABLE.has(type) && data.closed === false)) {
      stroke = HIGHLIGHT.openSwitch
      strokeWidth = 2
    }
    if (opts.sourceSide.has(id)) {
      stroke = HIGHLIGHT.sourceSide
      strokeWidth = 3
    }
    if (opts.loadSide.has(id)) {
      stroke = HIGHLIGHT.loadSide
      strokeWidth = 3
    }
    if (opts.faultId === id) {
      stroke = HIGHLIGHT.fault
      strokeWidth = 4
    }
    if (data.isPowerSource || type === 'powerSource') {
      if (opts.faultId !== id && !opts.sourceSide.has(id) && !opts.loadSide.has(id)) {
        stroke = HIGHLIGHT.power
      }
    }

    if (type === 'bus' || type === 'station') {
      node.attr('body/stroke', stroke)
      node.attr('body/strokeWidth', strokeWidth)
    } else if (type === 'breaker') {
      node.attr('symbol/stroke', stroke)
      node.attr('symbol/strokeWidth', strokeWidth)
    } else if (type === 'disconnector') {
      node.attr('symbol/stroke', stroke)
      node.attr('symbol/strokeWidth', strokeWidth)
    } else if (type === 'transformer') {
      node.attr('c1/stroke', stroke)
      node.attr('c2/stroke', stroke)
      node.attr('c1/strokeWidth', strokeWidth)
      node.attr('c2/strokeWidth', strokeWidth)
    } else if (type === 'load') {
      node.attr('symbol/stroke', stroke)
      node.attr('symbol/strokeWidth', strokeWidth)
    } else if (type === 'powerSource') {
      node.attr('symbol/stroke', stroke)
      node.attr('symbol/strokeWidth', strokeWidth)
    }
  }

  for (const edge of graph.getEdges()) {
    const s = edge.getSourceCellId()
    const t = edge.getTargetCellId()
    const inImpact =
      (s && (opts.sourceSide.has(s) || opts.loadSide.has(s) || opts.faultId === s)) ||
      (t && (opts.sourceSide.has(t) || opts.loadSide.has(t) || opts.faultId === t))
    edge.attr('line/stroke', inImpact ? '#e67e22' : '#566573')
    edge.attr('line/strokeWidth', inImpact ? 3 : 2)
  }
}

export function refreshSwitchVisual(graph: Graph, nodeId: string, closed: boolean) {
  const cell = graph.getCellById(nodeId)
  if (!cell || !cell.isNode()) return
  const data = (cell.getData() ?? {}) as Record<string, unknown>
  const type = data.type as DeviceType
  const visual = markupFor(type, closed)
  cell.setData({ ...data, closed })
  if (type === 'breaker') {
    cell.attr('symbol/fill', closed ? '#2c3e50' : '#fff')
    cell.attr('symbol/stroke', closed ? HIGHLIGHT.defaultStroke : HIGHLIGHT.openSwitch)
  } else if (type === 'disconnector') {
    const d = visual.attrs.symbol?.d
    if (typeof d === 'string') cell.attr('symbol/d', d)
    cell.attr('symbol/stroke', closed ? HIGHLIGHT.defaultStroke : HIGHLIGHT.openSwitch)
  }
}
