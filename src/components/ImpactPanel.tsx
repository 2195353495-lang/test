import type {
  CrossStationImpactResult,
  GridProject,
} from '../domain/types'

interface Props {
  result: CrossStationImpactResult | null
  project: GridProject
  faultId: string | null
  currentStationId: string | null
  onJumpStation: (stationId: string) => void
}

function nameOf(project: GridProject, stationId: string | null, id: string) {
  if (!stationId) {
    for (const st of Object.values(project.stations)) {
      const n = st.graph.nodes.find((x) => x.id === id)
      if (n) return n.name
    }
    return id
  }
  return project.stations[stationId]?.graph.nodes.find((n) => n.id === id)?.name ?? id
}

export function ImpactPanel({
  result,
  project,
  faultId,
  currentStationId,
  onJumpStation,
}: Props) {
  const localIds = currentStationId
    ? new Set(project.stations[currentStationId]?.graph.nodes.map((n) => n.id) ?? [])
    : new Set<string>()

  return (
    <aside className="panel impact-panel">
      <h2>影响范围</h2>
      {!result ? (
        <p className="hint">
          {faultId
            ? `已选故障点：${nameOf(project, currentStationId, faultId)}。点击「分析影响」。`
            : '在站内用「设故障点」点击设备，再点「分析影响」。'}
        </p>
      ) : (
        <div className="result-blocks">
          <section>
            <h3>故障点</h3>
            <p>
              {project.stations[result.faultStationId]?.name ?? result.faultStationId} /{' '}
              {nameOf(project, result.faultStationId, result.faultNodeId)}
            </p>
          </section>
          <section>
            <h3>受影响站（{result.affectedStations.length}）</h3>
            <ul>
              {result.affectedStations.map((sid) => (
                <li key={sid} className="jump-row">
                  <span>{project.stations[sid]?.name ?? sid}</span>
                  {sid !== currentStationId && (
                    <button type="button" className="linkish" onClick={() => onJumpStation(sid)}>
                      打开并高亮
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>受影响联络线（{result.affectedTieLines.length}）</h3>
            <ul>
              {result.affectedTieLines.length ? (
                result.affectedTieLines.map((tid) => {
                  const tie = project.overview.tieLines.find((t) => t.id === tid)
                  return <li key={tid}>{tie?.name ?? tid}</li>
                })
              ) : (
                <li className="muted">无</li>
              )}
            </ul>
          </section>
          <section>
            <h3>
              本站受影响设备（
              {result.affectedIsland.filter((id) => localIds.has(id)).length}）
            </h3>
            <ul>
              {result.affectedIsland
                .filter((id) => localIds.has(id))
                .map((id) => (
                  <li key={id}>{nameOf(project, currentStationId, id)}</li>
                ))}
            </ul>
          </section>
          <section>
            <h3 className="source">
              电源侧（本站 {result.sourceSide.filter((id) => localIds.has(id)).length}）
            </h3>
            <ul>
              {result.sourceSide
                .filter((id) => localIds.has(id))
                .map((id) => (
                  <li key={id}>{nameOf(project, currentStationId, id)}</li>
                ))}
            </ul>
          </section>
          <section>
            <h3 className="load">
              负荷侧（本站 {result.loadSide.filter((id) => localIds.has(id)).length}）
            </h3>
            <ul>
              {result.loadSide.filter((id) => localIds.has(id)).length ? (
                result.loadSide
                  .filter((id) => localIds.has(id))
                  .map((id) => <li key={id}>{nameOf(project, currentStationId, id)}</li>)
              ) : (
                <li className="muted">无</li>
              )}
            </ul>
          </section>
          <section>
            <h3>阻断开关（{result.blockedBy.length}）</h3>
            <ul>
              {result.blockedBy.length ? (
                result.blockedBy.map((id) => (
                  <li key={id}>{nameOf(project, null, id)}</li>
                ))
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
