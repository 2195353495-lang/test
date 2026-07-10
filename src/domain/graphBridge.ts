import { Graph } from '@antv/x6'
import type { TopologyGraph, TopologyNode, DeviceType } from './types'
import { HIGHLIGHT, SYMBOL_LIBRARY, colorForVoltage } from './symbols'

const SWITCHABLE = new Set(['breaker', 'disconnector'])
const registered = new Set<string>()

function sizeFor(type: DeviceType, node?: TopologyNode) {
  const def = SYMBOL_LIBRARY.find((s) => s.type === type)
  return {
    width: node?.width ?? def?.width ?? 48,
    height: node?.height ?? def?.height ?? 48,
  }
}

/**
 * D5000 / 调度单线图风格图元
 * - 断路器：合=红实心矩形，分=绿空心矩形
 * - 刀闸：合=斜刀贴合，分=斜刀打开
 * - 母线：电压色粗线
 * - 主变：双圆
 * - 电源：圆 + 正弦
 */
function markupFor(
  type: DeviceType,
  closed?: boolean,
  voltage?: string,
): {
  markup: Array<{ tagName: string; selector: string }>
  attrs: Record<string, Record<string, unknown>>
} {
  const open = closed === false
  const vColor = colorForVoltage(voltage)
  const labelFont = 'SimSun, "Noto Sans SC", "Microsoft YaHei", sans-serif'

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
            stroke: HIGHLIGHT.stationStroke,
            strokeWidth: 1.5,
            rx: 2,
            ry: 2,
            refWidth: '100%',
            refHeight: '100%',
          },
          label: {
            refX: 10,
            refY: 14,
            textAnchor: 'start',
            textVerticalAnchor: 'top',
            fontSize: 13,
            fontWeight: 700,
            fill: '#9ec5e8',
            fontFamily: labelFont,
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
            fill: vColor,
            stroke: vColor,
            strokeWidth: 1,
            refWidth: '100%',
            refHeight: '100%',
          },
          label: {
            refX: 0,
            refY: -8,
            textAnchor: 'start',
            fontSize: 11,
            fill: vColor,
            fontFamily: labelFont,
          },
        },
      }
    case 'breaker':
      return {
        markup: [
          { tagName: 'rect', selector: 'hit' },
          { tagName: 'line', selector: 'leadTop' },
          { tagName: 'line', selector: 'leadBottom' },
          { tagName: 'rect', selector: 'symbol' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          hit: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          leadTop: {
            x1: '50%',
            y1: 0,
            x2: '50%',
            y2: '22%',
            stroke: vColor,
            strokeWidth: 2,
          },
          leadBottom: {
            x1: '50%',
            y1: '78%',
            x2: '50%',
            y2: '100%',
            stroke: vColor,
            strokeWidth: 2,
          },
          symbol: {
            refX: '50%',
            refY: '50%',
            width: 14,
            height: 20,
            xAlign: 'middle',
            yAlign: 'middle',
            // D5000：合闸红、分闸绿
            fill: open ? '#0b1a12' : HIGHLIGHT.closedSwitch,
            stroke: open ? HIGHLIGHT.openSwitch : HIGHLIGHT.closedSwitch,
            strokeWidth: 2,
          },
          label: {
            refX: '100%',
            refX2: 4,
            refY: '50%',
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            fontSize: 10,
            fill: '#a8bdd0',
            fontFamily: labelFont,
          },
        },
      }
    case 'disconnector':
      return {
        markup: [
          { tagName: 'rect', selector: 'hit' },
          { tagName: 'line', selector: 'leadTop' },
          { tagName: 'line', selector: 'leadBottom' },
          { tagName: 'circle', selector: 'pivot' },
          { tagName: 'path', selector: 'blade' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          hit: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          leadTop: {
            x1: '50%',
            y1: 0,
            x2: '50%',
            y2: '30%',
            stroke: vColor,
            strokeWidth: 2,
          },
          leadBottom: {
            x1: '50%',
            y1: '70%',
            x2: '50%',
            y2: '100%',
            stroke: vColor,
            strokeWidth: 2,
          },
          pivot: {
            refCx: '50%',
            refCy: '70%',
            r: 2.5,
            fill: vColor,
            stroke: vColor,
          },
          // 合：刀刃竖直导通；分：刀刃斜开
          blade: {
            refX: '50%',
            refY: '50%',
            d: open ? 'M 0 8 L 10 -6' : 'M 0 8 L 0 -8',
            stroke: open ? HIGHLIGHT.openSwitch : vColor,
            strokeWidth: 2.5,
            strokeLinecap: 'round',
            fill: 'none',
          },
          label: {
            refX: '100%',
            refX2: 4,
            refY: '50%',
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            fontSize: 10,
            fill: '#a8bdd0',
            fontFamily: labelFont,
          },
        },
      }
    case 'transformer':
      return {
        markup: [
          { tagName: 'rect', selector: 'hit' },
          { tagName: 'line', selector: 'leadTop' },
          { tagName: 'line', selector: 'leadBottom' },
          { tagName: 'circle', selector: 'c1' },
          { tagName: 'circle', selector: 'c2' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          hit: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          leadTop: {
            x1: '50%',
            y1: 0,
            x2: '50%',
            y2: '18%',
            stroke: colorForVoltage('220kV'),
            strokeWidth: 2,
          },
          leadBottom: {
            x1: '50%',
            y1: '82%',
            x2: '50%',
            y2: '100%',
            stroke: colorForVoltage('110kV'),
            strokeWidth: 2,
          },
          c1: {
            refCx: '50%',
            refCy: '38%',
            r: 12,
            fill: 'none',
            stroke: colorForVoltage('220kV'),
            strokeWidth: 2.5,
          },
          c2: {
            refCx: '50%',
            refCy: '58%',
            r: 12,
            fill: 'none',
            stroke: colorForVoltage('110kV'),
            strokeWidth: 2.5,
          },
          label: {
            refX: '100%',
            refX2: 4,
            refY: '50%',
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            fontSize: 10,
            fill: '#a8bdd0',
            fontFamily: labelFont,
          },
        },
      }
    case 'load':
      return {
        markup: [
          { tagName: 'rect', selector: 'hit' },
          { tagName: 'line', selector: 'lead' },
          { tagName: 'path', selector: 'symbol' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          hit: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          lead: {
            x1: '50%',
            y1: 0,
            x2: '50%',
            y2: '35%',
            stroke: vColor,
            strokeWidth: 2,
          },
          symbol: {
            refX: '50%',
            refY: '55%',
            d: 'M 0 -8 L 9 8 L -9 8 Z',
            fill: 'none',
            stroke: vColor,
            strokeWidth: 2,
          },
          label: {
            refX: '100%',
            refX2: 4,
            refY: '50%',
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            fontSize: 10,
            fill: '#a8bdd0',
            fontFamily: labelFont,
          },
        },
      }
    case 'powerSource':
      return {
        markup: [
          { tagName: 'rect', selector: 'hit' },
          { tagName: 'line', selector: 'lead' },
          { tagName: 'circle', selector: 'symbol' },
          { tagName: 'path', selector: 'wave' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          hit: {
            fill: 'transparent',
            stroke: 'transparent',
            refWidth: '100%',
            refHeight: '100%',
          },
          lead: {
            x1: '50%',
            y1: 0,
            x2: '50%',
            y2: '18%',
            stroke: vColor,
            strokeWidth: 2,
          },
          symbol: {
            refCx: '50%',
            refCy: '55%',
            r: 15,
            fill: '#0a1622',
            stroke: vColor,
            strokeWidth: 2.5,
          },
          wave: {
            refX: '50%',
            refY: '55%',
            d: 'M -8 0 C -4 -8, 4 8, 8 0',
            fill: 'none',
            stroke: vColor,
            strokeWidth: 2,
          },
          label: {
            refX: '100%',
            refX2: 4,
            refY: '50%',
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            fontSize: 10,
            fill: '#a8bdd0',
            fontFamily: labelFont,
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
            fill: '#0a1622',
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
            fill: '#d9d9d9',
          },
        },
      }
  }
}

export function registerPowerShapes() {
  for (const def of SYMBOL_LIBRARY) {
    const shapeName = `power-${def.type}`
    if (registered.has(shapeName)) continue
    const base = markupFor(def.type, true, def.defaultVoltage)
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
            top: {
              position: 'top',
              attrs: {
                circle: {
                  r: 3,
                  magnet: true,
                  stroke: '#5b8ff9',
                  strokeWidth: 1,
                  fill: '#fff',
                  style: { visibility: 'hidden' },
                },
              },
            },
            bottom: {
              position: 'bottom',
              attrs: {
                circle: {
                  r: 3,
                  magnet: true,
                  stroke: '#5b8ff9',
                  strokeWidth: 1,
                  fill: '#fff',
                  style: { visibility: 'hidden' },
                },
              },
            },
            left: {
              position: 'left',
              attrs: {
                circle: {
                  r: 3,
                  magnet: true,
                  stroke: '#5b8ff9',
                  strokeWidth: 1,
                  fill: '#fff',
                  style: { visibility: 'hidden' },
                },
              },
            },
            right: {
              position: 'right',
              attrs: {
                circle: {
                  r: 3,
                  magnet: true,
                  stroke: '#5b8ff9',
                  strokeWidth: 1,
                  fill: '#fff',
                  style: { visibility: 'hidden' },
                },
              },
            },
          },
          items: [
            { id: 'top', group: 'top' },
            { id: 'bottom', group: 'bottom' },
            { id: 'left', group: 'left' },
            { id: 'right', group: 'right' },
          ],
        },
      } as never,
      true,
    )
    registered.add(shapeName)
  }
}

function pickPorts(source: TopologyNode, target: TopologyNode): {
  sourcePort: string
  targetPort: string
} {
  const sCx = source.x + (source.width ?? 20) / 2
  const sCy = source.y + (source.height ?? 20) / 2
  const tCx = target.x + (target.width ?? 20) / 2
  const tCy = target.y + (target.height ?? 20) / 2
  const dx = tCx - sCx
  const dy = tCy - sCy
  if (Math.abs(dy) >= Math.abs(dx)) {
    return {
      sourcePort: dy >= 0 ? 'bottom' : 'top',
      targetPort: dy >= 0 ? 'top' : 'bottom',
    }
  }
  return {
    sourcePort: dx >= 0 ? 'right' : 'left',
    targetPort: dx >= 0 ? 'left' : 'right',
  }
}

export function nodeToX6Config(node: TopologyNode): Record<string, unknown> {
  const { width, height } = sizeFor(node.type, node)
  const visual = markupFor(node.type, node.closed, node.voltage)
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

function edgeStroke(data: TopologyGraph, edge: { source: string; target: string; name?: string }) {
  const s = data.nodes.find((n) => n.id === edge.source)
  const t = data.nodes.find((n) => n.id === edge.target)
  const voltage = s?.voltage || t?.voltage
  if (edge.name?.includes('联络') || edge.name?.includes('线')) {
    return colorForVoltage(voltage || '220kV')
  }
  return colorForVoltage(voltage)
}

export function loadGraphIntoX6(graph: Graph, data: TopologyGraph) {
  graph.clearCells()
  const stations = data.nodes.filter((n) => n.type === 'station')
  const others = data.nodes.filter((n) => n.type !== 'station')
  for (const n of [...stations, ...others]) {
    graph.addNode(nodeToX6Config(n))
  }

  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]))
  for (const e of data.edges) {
    const s = nodeMap.get(e.source)
    const t = nodeMap.get(e.target)
    const ports =
      s && t ? pickPorts(s, t) : { sourcePort: 'bottom', targetPort: 'top' }
    const stroke = edgeStroke(data, e)
    graph.addEdge({
      id: e.id,
      source: { cell: e.source, port: ports.sourcePort },
      target: { cell: e.target, port: ports.targetPort },
      attrs: {
        line: {
          stroke,
          strokeWidth: e.name ? 3 : 2,
          targetMarker: null,
        },
      },
      labels: e.name
        ? [
            {
              attrs: {
                label: {
                  text: e.name,
                  fill: stroke,
                  fontSize: 11,
                  fontFamily: 'SimSun, "Noto Sans SC", sans-serif',
                },
                rect: {
                  fill: '#0b1e2e',
                  stroke: 'transparent',
                  rx: 2,
                  ry: 2,
                },
              },
            },
          ]
        : [],
      data: { name: e.name, voltage: s?.voltage || t?.voltage },
      zIndex: 5,
      router: { name: 'orth', args: { padding: 8 } },
      connector: { name: 'rounded', args: { radius: 2 } },
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
    const voltage = data.voltage as string | undefined
    let stroke = colorForVoltage(voltage)
    let strokeWidth = 2.5

    if (opts.openSwitches.has(id) || (SWITCHABLE.has(type) && data.closed === false)) {
      stroke = HIGHLIGHT.openSwitch
    }
    if (opts.sourceSide.has(id)) {
      stroke = HIGHLIGHT.sourceSide
      strokeWidth = 3.5
    }
    if (opts.loadSide.has(id)) {
      stroke = HIGHLIGHT.loadSide
      strokeWidth = 3.5
    }
    if (opts.faultId === id) {
      stroke = HIGHLIGHT.fault
      strokeWidth = 4
    }

    if (type === 'bus' || type === 'station') {
      node.attr('body/stroke', stroke)
      node.attr('body/strokeWidth', type === 'bus' ? strokeWidth + 1 : strokeWidth)
      if (type === 'bus' && opts.faultId !== id && !opts.sourceSide.has(id) && !opts.loadSide.has(id)) {
        node.attr('body/fill', colorForVoltage(voltage))
      }
    } else if (type === 'breaker') {
      node.attr('symbol/stroke', stroke)
      node.attr('leadTop/stroke', stroke)
      node.attr('leadBottom/stroke', stroke)
    } else if (type === 'disconnector') {
      node.attr('blade/stroke', stroke)
      node.attr('pivot/fill', stroke)
      node.attr('leadTop/stroke', stroke)
      node.attr('leadBottom/stroke', stroke)
    } else if (type === 'transformer') {
      node.attr('c1/stroke', stroke)
      node.attr('c2/stroke', stroke)
      node.attr('leadTop/stroke', stroke)
      node.attr('leadBottom/stroke', stroke)
    } else if (type === 'load') {
      node.attr('symbol/stroke', stroke)
      node.attr('lead/stroke', stroke)
    } else if (type === 'powerSource') {
      node.attr('symbol/stroke', stroke)
      node.attr('wave/stroke', stroke)
      node.attr('lead/stroke', stroke)
    }
  }

  for (const edge of graph.getEdges()) {
    const s = edge.getSourceCellId()
    const t = edge.getTargetCellId()
    const inImpact =
      (s && (opts.sourceSide.has(s) || opts.loadSide.has(s) || opts.faultId === s)) ||
      (t && (opts.sourceSide.has(t) || opts.loadSide.has(t) || opts.faultId === t))
    const data = (edge.getData() ?? {}) as { voltage?: string }
    edge.attr('line/stroke', inImpact ? '#ffa940' : colorForVoltage(data.voltage))
    edge.attr('line/strokeWidth', inImpact ? 4 : edge.getLabels()?.length ? 3 : 2)
  }
}

export function refreshSwitchVisual(graph: Graph, nodeId: string, closed: boolean) {
  const cell = graph.getCellById(nodeId)
  if (!cell || !cell.isNode()) return
  const data = (cell.getData() ?? {}) as Record<string, unknown>
  const type = data.type as DeviceType
  const voltage = data.voltage as string | undefined
  const visual = markupFor(type, closed, voltage)
  cell.setData({ ...data, closed })
  if (type === 'breaker') {
    cell.attr('symbol/fill', closed ? HIGHLIGHT.closedSwitch : '#0b1a12')
    cell.attr('symbol/stroke', closed ? HIGHLIGHT.closedSwitch : HIGHLIGHT.openSwitch)
  } else if (type === 'disconnector') {
    const d = visual.attrs.blade?.d
    if (typeof d === 'string') cell.attr('blade/d', d)
    cell.attr('blade/stroke', closed ? colorForVoltage(voltage) : HIGHLIGHT.openSwitch)
  }
}
