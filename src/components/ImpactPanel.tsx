import type { ImpactAnalysisResult, TopologyGraph } from '../domain/types'

interface Props {
  result: ImpactAnalysisResult | null
  graph: TopologyGraph | null
  faultId: string | null
}

function nameOf(graph: TopologyGraph | null, id: string) {
  return graph?.nodes.find((n) => n.id === id)?.name ?? id
}

export function ImpactPanel({ result, graph, faultId }: Props) {
  return (
    <aside className="panel impact-panel">
      <h2>影响范围</h2>
      {!result ? (
        <p className="hint">
          {faultId
            ? `已选故障点：${nameOf(graph, faultId)}。点击「分析影响」运行。`
            : '用「设故障点」点击设备，再点「分析影响」。'}
        </p>
      ) : (
        <div className="result-blocks">
          <section>
            <h3>故障点</h3>
            <p>{nameOf(graph, result.faultNodeId)}</p>
          </section>
          <section>
            <h3>受影响岛（{result.affectedIsland.length}）</h3>
            <ul>
              {result.affectedIsland.map((id) => (
                <li key={id}>{nameOf(graph, id)}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="source">电源侧（{result.sourceSide.length}）</h3>
            <ul>
              {result.sourceSide.map((id) => (
                <li key={id}>{nameOf(graph, id)}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="load">负荷侧（{result.loadSide.length}）</h3>
            <ul>
              {result.loadSide.length ? (
                result.loadSide.map((id) => <li key={id}>{nameOf(graph, id)}</li>)
              ) : (
                <li className="muted">无（故障点在电源路径末端）</li>
              )}
            </ul>
          </section>
          <section>
            <h3>阻断开关（{result.blockedBy.length}）</h3>
            <ul>
              {result.blockedBy.length ? (
                result.blockedBy.map((id) => <li key={id}>{nameOf(graph, id)}</li>)
              ) : (
                <li className="muted">无相邻分位开关</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </aside>
  )
}
