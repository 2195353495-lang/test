import { useCallback, useRef, useState } from 'react'
import { SymbolToolbar } from './components/SymbolToolbar'
import { TopologyCanvas } from './components/TopologyCanvas'
import { ImpactPanel } from './components/ImpactPanel'
import type {
  DeviceType,
  ImpactAnalysisResult,
  InteractionMode,
  TopologyGraph,
} from './domain/types'
import { sampleThreeStationGraph } from './domain/sampleGraph'
import './App.css'

const MODES: { id: InteractionMode; label: string }[] = [
  { id: 'select', label: '选择' },
  { id: 'connect', label: '连线' },
  { id: 'toggleSwitch', label: '分合切换' },
  { id: 'setPower', label: '设电源' },
  { id: 'setFault', label: '设故障点' },
]

export default function App() {
  const [mode, setMode] = useState<InteractionMode>('select')
  const [faultId, setFaultId] = useState<string | null>(null)
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null)
  const [graph, setGraph] = useState<TopologyGraph | null>(null)
  const [pendingAdd, setPendingAdd] = useState<{ type: string; name: string } | null>(null)
  const [analyzeToken, setAnalyzeToken] = useState(0)
  const [clearToken, setClearToken] = useState(0)
  const [loadToken, setLoadToken] = useState(0)
  const [loadData, setLoadData] = useState<TopologyGraph | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onAdd = useCallback((type: DeviceType, name: string) => {
    setPendingAdd({ type, name })
  }, [])

  const exportJson = () => {
    if (!graph) return
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'topology.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as TopologyGraph
        if (!data.nodes || !data.edges) throw new Error('invalid')
        setLoadData(data)
        setLoadToken((t) => t + 1)
        setFaultId(null)
        setResult(null)
      } catch {
        window.alert('无法解析拓扑 JSON')
      }
    }
    reader.readAsText(file)
  }

  const saveLocal = () => {
    if (!graph) return
    localStorage.setItem('grid-topology-demo', JSON.stringify(graph))
    window.alert('已保存到浏览器 localStorage')
  }

  const loadLocal = () => {
    const raw = localStorage.getItem('grid-topology-demo')
    if (!raw) {
      window.alert('本地没有保存的拓扑')
      return
    }
    try {
      const data = JSON.parse(raw) as TopologyGraph
      setLoadData(data)
      setLoadToken((t) => t + 1)
      setFaultId(null)
      setResult(null)
    } catch {
      window.alert('本地数据损坏')
    }
  }

  const loadSample = () => {
    setLoadData(sampleThreeStationGraph)
    setLoadToken((t) => t + 1)
    setFaultId(null)
    setResult(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">主网单线图</span>
          <span className="brand-sub">D5000 风格 · 影响范围分析验证</span>
        </div>
        <div className="mode-group" role="toolbar" aria-label="交互模式">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={mode === m.id ? 'active' : ''}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="primary" onClick={() => setAnalyzeToken((t) => t + 1)}>
            分析影响
          </button>
          <button type="button" onClick={() => setClearToken((t) => t + 1)}>
            清除高亮
          </button>
          <button type="button" onClick={loadSample}>
            加载样例
          </button>
          <button type="button" onClick={saveLocal}>
            本地保存
          </button>
          <button type="button" onClick={loadLocal}>
            本地读取
          </button>
          <button type="button" onClick={exportJson}>
            导出 JSON
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <main className="workspace">
        <SymbolToolbar onAdd={onAdd} />
        <section className="canvas-wrap">
          <TopologyCanvas
            mode={mode}
            faultId={faultId}
            onFaultChange={setFaultId}
            onResult={setResult}
            onGraphChange={setGraph}
            pendingAdd={pendingAdd}
            onPendingConsumed={() => setPendingAdd(null)}
            analyzeToken={analyzeToken}
            clearToken={clearToken}
            loadToken={loadToken}
            loadData={loadData}
          />
        </section>
        <ImpactPanel result={result} graph={graph} faultId={faultId} />
      </main>
    </div>
  )
}
