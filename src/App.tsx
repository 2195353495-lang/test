import { useCallback, useRef, useState } from 'react'
import { SymbolToolbar } from './components/SymbolToolbar'
import { OverviewCanvas } from './components/OverviewCanvas'
import { StationCanvas } from './components/StationCanvas'
import { ImpactPanel } from './components/ImpactPanel'
import type {
  AppView,
  CrossStationImpactResult,
  DeviceType,
  GridProject,
  HighlightContext,
  InteractionMode,
  OverviewMode,
} from './domain/types'
import {
  downloadBlob,
  exportOverviewJson,
  exportProjectZip,
  exportStationJson,
  importProjectZip,
  loadInitialProject,
  replaceOverview,
  replaceStation,
  saveProjectToLocal,
} from './domain/projectStore'
import { createSampleProject } from './domain/sampleProject'
import './App.css'

const STATION_MODES: { id: InteractionMode; label: string }[] = [
  { id: 'select', label: '选择' },
  { id: 'connect', label: '连线' },
  { id: 'toggleSwitch', label: '分合切换' },
  { id: 'setPower', label: '设电源' },
  { id: 'setFault', label: '设故障点' },
]

const OVERVIEW_MODES: { id: OverviewMode; label: string }[] = [
  { id: 'select', label: '选择/进站' },
  { id: 'moveStation', label: '移动站' },
  { id: 'addTieLine', label: '加联络线' },
]

export default function App() {
  const [project, setProject] = useState<GridProject>(() => loadInitialProject())
  const [view, setView] = useState<AppView>('overview')
  const [stationId, setStationId] = useState<string | null>(null)
  const [stationMode, setStationMode] = useState<InteractionMode>('select')
  const [overviewMode, setOverviewMode] = useState<OverviewMode>('select')
  const [faultId, setFaultId] = useState<string | null>(null)
  const [result, setResult] = useState<CrossStationImpactResult | null>(null)
  const [highlightContext, setHighlightContext] = useState<HighlightContext | null>(null)
  const [pendingAdd, setPendingAdd] = useState<{
    type: string
    name: string
    isBoundary?: boolean
  } | null>(null)
  const [analyzeToken, setAnalyzeToken] = useState(0)
  const [clearToken, setClearToken] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const zipRef = useRef<HTMLInputElement>(null)

  const onAdd = useCallback((type: DeviceType, name: string) => {
    const isBoundary =
      type === 'disconnector' && window.confirm('是否添加为边界端口设备？')
    setPendingAdd({ type, name, isBoundary })
  }, [])

  const enterStation = (id: string, ctx?: HighlightContext | null) => {
    setStationId(id)
    setView('station')
    setFaultId(null)
    setStationMode('select')
    if (ctx) setHighlightContext(ctx)
    else setHighlightContext(null)
  }

  const backOverview = () => {
    setView('overview')
    setStationId(null)
    setFaultId(null)
    setResult(null)
    setHighlightContext(null)
    setOverviewMode('select')
  }

  const jumpStation = (id: string) => {
    if (!result) {
      enterStation(id)
      return
    }
    enterStation(id, {
      faultStationId: result.faultStationId,
      faultNodeId: result.faultNodeId,
      sourceSide: result.sourceSide,
      loadSide: result.loadSide,
      remoteHighlights: result.remoteHighlights,
      affectedTieLines: result.affectedTieLines,
    })
  }

  const onProjectChange = (next: GridProject) => {
    setProject(next)
  }

  const saveLocal = () => {
    saveProjectToLocal(project)
    window.alert('已按分 key 保存到 localStorage')
  }

  const loadSample = () => {
    const sample = createSampleProject()
    setProject(sample)
    setResult(null)
    setHighlightContext(null)
    setFaultId(null)
    setView('overview')
    setStationId(null)
  }

  const exportCurrent = () => {
    if (view === 'overview') {
      downloadBlob(exportOverviewJson(project), 'overview.json')
      return
    }
    if (!stationId) return
    downloadBlob(exportStationJson(project.stations[stationId]), `${stationId}.json`)
  }

  const exportAll = async () => {
    const blob = await exportProjectZip(project)
    downloadBlob(blob, 'grid-project.zip')
  }

  const importCurrent = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (view === 'overview') {
          if (!data.tieLines) throw new Error('invalid overview')
          setProject(replaceOverview(project, data))
        } else if (stationId) {
          if (!data.graph || !data.id) throw new Error('invalid station')
          setProject(replaceStation(project, data))
        }
        setResult(null)
        setHighlightContext(null)
      } catch {
        window.alert('无法解析当前层 JSON')
      }
    }
    reader.readAsText(file)
  }

  const importZip = async (file: File) => {
    try {
      const next = await importProjectZip(file)
      setProject(next)
      setView('overview')
      setStationId(null)
      setResult(null)
      setHighlightContext(null)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '导入 zip 失败')
    }
  }

  const currentStation = stationId ? project.stations[stationId] : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <button type="button" className="brand-btn" onClick={backOverview}>
            <span className="brand-mark">主网单线图</span>
            <span className="brand-sub">
              {view === 'overview'
                ? '总览 · 点站进入接线图'
                : `${currentStation?.name ?? ''} · 点击返回总览`}
            </span>
          </button>
        </div>

        {view === 'overview' ? (
          <div className="mode-group" role="toolbar" aria-label="总览模式">
            {OVERVIEW_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={overviewMode === m.id ? 'active' : ''}
                onClick={() => setOverviewMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mode-group" role="toolbar" aria-label="站内模式">
            <button type="button" className="primary" onClick={backOverview}>
              ← 返回总览
            </button>
            {STATION_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={stationMode === m.id ? 'active' : ''}
                onClick={() => setStationMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="actions">
          {view === 'station' && (
            <>
              <button
                type="button"
                className="primary"
                onClick={() => setAnalyzeToken((t) => t + 1)}
              >
                分析影响
              </button>
              <button type="button" onClick={() => setClearToken((t) => t + 1)}>
                清除高亮
              </button>
            </>
          )}
          <button type="button" onClick={loadSample}>
            加载样例
          </button>
          <button type="button" onClick={saveLocal}>
            本地保存
          </button>
          <button type="button" onClick={exportCurrent}>
            {view === 'overview' ? '导出总览' : '导出本站'}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            导入当前层
          </button>
          <button type="button" onClick={() => void exportAll()}>
            导出全部zip
          </button>
          <button type="button" onClick={() => zipRef.current?.click()}>
            导入zip
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importCurrent(f)
              e.target.value = ''
            }}
          />
          <input
            ref={zipRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importZip(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <main className="workspace">
        {view === 'station' ? (
          <SymbolToolbar onAdd={onAdd} />
        ) : (
          <aside className="panel symbol-panel">
            <h2>总览</h2>
            <p className="hint">
              「选择/进站」点击站进入接线图。「移动站」拖动站位置。「加联络线」依次点两站并选择边界端口。选中联络线后 Delete 删除。
            </p>
            <ul className="symbol-list">
              {Object.values(project.stations).map((st) => (
                <li key={st.id}>
                  <button type="button" onClick={() => enterStation(st.id)}>
                    {st.name}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <section className="canvas-wrap">
          {view === 'overview' ? (
            <OverviewCanvas
              project={project}
              mode={overviewMode}
              onEnterStation={(id) => enterStation(id)}
              onProjectChange={onProjectChange}
              highlightedTieIds={result?.affectedTieLines ?? highlightContext?.affectedTieLines ?? []}
            />
          ) : (
            stationId && (
              <StationCanvas
                key={stationId}
                project={project}
                stationId={stationId}
                mode={stationMode}
                faultId={faultId}
                onFaultChange={setFaultId}
                onResult={setResult}
                onProjectChange={onProjectChange}
                pendingAdd={pendingAdd}
                onPendingConsumed={() => setPendingAdd(null)}
                analyzeToken={analyzeToken}
                clearToken={clearToken}
                highlightContext={highlightContext}
              />
            )
          )}
        </section>

        {view === 'station' ? (
          <ImpactPanel
            result={result}
            project={project}
            faultId={faultId}
            currentStationId={stationId}
            onJumpStation={jumpStation}
          />
        ) : (
          <aside className="panel impact-panel">
            <h2>工程信息</h2>
            <p className="hint">3 站样例：A 单母 / B 双母 / C 桥形占位</p>
            <ul>
              {Object.values(project.stations).map((st) => (
                <li key={st.id}>
                  {st.name} · 端口 {st.ports.length} · 设备 {st.graph.nodes.length}
                </li>
              ))}
            </ul>
            <h3>联络线</h3>
            <ul>
              {project.overview.tieLines.map((t) => (
                <li key={t.id}>
                  {t.name}（{t.fromStationId}↔{t.toStationId}）
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>
    </div>
  )
}
