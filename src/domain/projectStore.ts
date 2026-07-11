import JSZip from 'jszip'
import type {
  BoundaryPort,
  GridProject,
  OverviewDoc,
  StationDoc,
  TieLine,
} from './types'
import { createSampleProject } from './sampleProject'

const META_KEY = 'grid:meta'
const OVERVIEW_KEY = 'grid:overview'
const stationKey = (id: string) => `grid:station:${id}`

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function listPorts(project: GridProject, stationId: string): BoundaryPort[] {
  return project.stations[stationId]?.ports ?? []
}

export function findPort(
  project: GridProject,
  portId: string,
): BoundaryPort | undefined {
  for (const st of Object.values(project.stations)) {
    const p = st.ports.find((x) => x.id === portId)
    if (p) return p
  }
  return undefined
}

export function validateTieLine(
  project: GridProject,
  tie: TieLine,
): string | null {
  if (tie.fromStationId === tie.toStationId) return '联络线两端不能是同一站'
  const fromSt = project.stations[tie.fromStationId]
  const toSt = project.stations[tie.toStationId]
  if (!fromSt || !toSt) return '联络线引用了不存在的站'
  const fromPort = fromSt.ports.find((p) => p.id === tie.fromPortId)
  const toPort = toSt.ports.find((p) => p.id === tie.toPortId)
  if (!fromPort) return '起始端口不存在或不属于起始站'
  if (!toPort) return '终止端口不存在或不属于终止站'
  if (fromPort.stationId !== tie.fromStationId) return '起始端口站不一致'
  if (toPort.stationId !== tie.toStationId) return '终止端口站不一致'
  return null
}

/** 删除设备前：若为边界且被联络线引用则级联删除联络线 */
export function removeDeviceWithCascade(
  project: GridProject,
  stationId: string,
  deviceId: string,
): GridProject {
  const next = clone(project)
  const st = next.stations[stationId]
  if (!st) return next

  const portIds = st.ports.filter((p) => p.deviceId === deviceId).map((p) => p.id)
  st.graph.nodes = st.graph.nodes.filter((n) => n.id !== deviceId)
  st.graph.edges = st.graph.edges.filter(
    (e) => e.source !== deviceId && e.target !== deviceId,
  )
  st.ports = st.ports.filter((p) => p.deviceId !== deviceId)
  if (portIds.length) {
    next.overview.tieLines = next.overview.tieLines.filter(
      (t) => !portIds.includes(t.fromPortId) && !portIds.includes(t.toPortId),
    )
  }
  return next
}

export function syncPortsFromGraph(station: StationDoc): StationDoc {
  const next = clone(station)
  const boundaryNodes = next.graph.nodes.filter((n) => n.isBoundary)
  const byDevice = new Map(next.ports.map((p) => [p.deviceId, p]))
  next.ports = boundaryNodes.map((n) => {
    const existing = byDevice.get(n.id)
    return (
      existing ?? {
        id: `port_${n.id}`,
        stationId: next.id,
        deviceId: n.id,
        name: n.name,
      }
    )
  })
  return next
}

export function saveProjectToLocal(project: GridProject) {
  const stationIds = Object.keys(project.stations)
  localStorage.setItem(META_KEY, JSON.stringify({ version: 1, stationIds }))
  localStorage.setItem(OVERVIEW_KEY, JSON.stringify(project.overview))
  for (const id of stationIds) {
    localStorage.setItem(stationKey(id), JSON.stringify(project.stations[id]))
  }
  // 清理已删除的站
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('grid:station:')) {
      const id = key.replace('grid:station:', '')
      if (!stationIds.includes(id)) localStorage.removeItem(key)
    }
  }
}

export function loadProjectFromLocal(): GridProject | null {
  const metaRaw = localStorage.getItem(META_KEY)
  const overviewRaw = localStorage.getItem(OVERVIEW_KEY)
  if (!metaRaw || !overviewRaw) return null
  try {
    const meta = JSON.parse(metaRaw) as { stationIds: string[] }
    const overview = JSON.parse(overviewRaw) as OverviewDoc
    const stations: Record<string, StationDoc> = {}
    for (const id of meta.stationIds) {
      const raw = localStorage.getItem(stationKey(id))
      if (!raw) return null
      stations[id] = JSON.parse(raw) as StationDoc
    }
    return { version: 1, overview, stations }
  } catch {
    return null
  }
}

export function exportOverviewJson(project: GridProject): Blob {
  return new Blob([JSON.stringify(project.overview, null, 2)], {
    type: 'application/json',
  })
}

export function exportStationJson(station: StationDoc): Blob {
  return new Blob([JSON.stringify(station, null, 2)], {
    type: 'application/json',
  })
}

export async function exportProjectZip(project: GridProject): Promise<Blob> {
  const zip = new JSZip()
  zip.file('overview.json', JSON.stringify(project.overview, null, 2))
  const folder = zip.folder('stations')
  for (const st of Object.values(project.stations)) {
    folder?.file(`${st.id}.json`, JSON.stringify(st, null, 2))
  }
  zip.file(
    'meta.json',
    JSON.stringify({ version: 1, stationIds: Object.keys(project.stations) }, null, 2),
  )
  return zip.generateAsync({ type: 'blob' })
}

export async function importProjectZip(file: Blob): Promise<GridProject> {
  const zip = await JSZip.loadAsync(file)
  const overviewRaw = await zip.file('overview.json')?.async('string')
  if (!overviewRaw) throw new Error('zip 缺少 overview.json')
  const overview = JSON.parse(overviewRaw) as OverviewDoc

  let stationIds: string[] = []
  const metaRaw = await zip.file('meta.json')?.async('string')
  if (metaRaw) {
    stationIds = (JSON.parse(metaRaw) as { stationIds: string[] }).stationIds
  } else {
    const files = Object.keys(zip.files).filter(
      (p) => p.startsWith('stations/') && p.endsWith('.json'),
    )
    stationIds = files.map((p) => p.replace('stations/', '').replace('.json', ''))
  }

  const stations: Record<string, StationDoc> = {}
  for (const id of stationIds) {
    const raw = await zip.file(`stations/${id}.json`)?.async('string')
    if (!raw) throw new Error(`zip 缺少 stations/${id}.json`)
    stations[id] = JSON.parse(raw) as StationDoc
  }
  return { version: 1, overview, stations }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function loadInitialProject(): GridProject {
  return loadProjectFromLocal() ?? createSampleProject()
}

export function replaceOverview(
  project: GridProject,
  overview: OverviewDoc,
): GridProject {
  return { ...project, overview: clone(overview) }
}

export function replaceStation(
  project: GridProject,
  station: StationDoc,
): GridProject {
  const synced = syncPortsFromGraph(station)
  return {
    ...project,
    stations: { ...project.stations, [synced.id]: synced },
  }
}
