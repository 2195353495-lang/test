import { SYMBOL_LIBRARY } from '../domain/symbols'
import type { DeviceType } from '../domain/types'

interface Props {
  onAdd: (type: DeviceType, name: string) => void
}

export function SymbolToolbar({ onAdd }: Props) {
  return (
    <aside className="panel symbol-panel">
      <h2>D5000 风格图元</h2>
      <p className="hint">
        点击添加。双击改名。右键拖动画布。断路器合红分绿；刀闸斜开表示分位。
      </p>
      <ul className="symbol-list">
        {SYMBOL_LIBRARY.map((s) => (
          <li key={s.type}>
            <button type="button" onClick={() => onAdd(s.type, s.defaultName)}>
              <span className={`glyph glyph-${s.type}`} aria-hidden />
              {s.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="legend">
        <h3>电压色</h3>
        <div className="volt">
          <span><i className="swatch v220" />220kV</span>
          <span><i className="swatch v110" />110kV</span>
        </div>
        <h3>状态 / 分析</h3>
        <div><i className="swatch closed" />合闸</div>
        <div><i className="swatch open" />分闸</div>
        <div><i className="swatch fault" />故障点</div>
        <div><i className="swatch source" />电源侧</div>
        <div><i className="swatch load" />负荷侧</div>
      </div>
    </aside>
  )
}
