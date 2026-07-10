import { SYMBOL_LIBRARY } from '../domain/symbols'
import type { DeviceType } from '../domain/types'

interface Props {
  onAdd: (type: DeviceType, name: string) => void
}

export function SymbolToolbar({ onAdd }: Props) {
  return (
    <aside className="panel symbol-panel">
      <h2>符号库</h2>
      <p className="hint">点击添加至画布，双击设备可改名</p>
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
        <h3>图例</h3>
        <div><i className="swatch fault" />故障点</div>
        <div><i className="swatch source" />电源侧</div>
        <div><i className="swatch load" />负荷侧</div>
        <div><i className="swatch open" />分位开关</div>
      </div>
    </aside>
  )
}
