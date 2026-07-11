import type { DeviceType } from './types'

/** 国网/D5000 常见电压等级着色 */
export const VOLTAGE_COLOR: Record<string, string> = {
  '500kV': '#e74c3c',
  '220kV': '#c039c6',
  '110kV': '#f1c40f',
  '35kV': '#f39c12',
  '10kV': '#9b59b6',
  default: '#ecf0f1',
}

export function colorForVoltage(voltage?: string): string {
  if (!voltage) return VOLTAGE_COLOR.default
  for (const [k, v] of Object.entries(VOLTAGE_COLOR)) {
    if (k !== 'default' && voltage.includes(k.replace('kV', ''))) return v
    if (voltage === k) return v
  }
  if (voltage.includes('220')) return VOLTAGE_COLOR['220kV']
  if (voltage.includes('110')) return VOLTAGE_COLOR['110kV']
  if (voltage.includes('500')) return VOLTAGE_COLOR['500kV']
  if (voltage.includes('35')) return VOLTAGE_COLOR['35kV']
  if (voltage.includes('10')) return VOLTAGE_COLOR['10kV']
  return VOLTAGE_COLOR.default
}

export interface SymbolDef {
  type: DeviceType
  label: string
  defaultName: string
  width: number
  height: number
  switchable?: boolean
  defaultVoltage?: string
}

export const SYMBOL_LIBRARY: SymbolDef[] = [
  { type: 'station', label: '厂站框', defaultName: '变电站', width: 280, height: 320 },
  { type: 'bus', label: '母线', defaultName: '母线', width: 200, height: 10, defaultVoltage: '220kV' },
  { type: 'breaker', label: '断路器', defaultName: '断路器', width: 22, height: 36, switchable: true, defaultVoltage: '220kV' },
  { type: 'disconnector', label: '刀闸', defaultName: '刀闸', width: 22, height: 32, switchable: true, defaultVoltage: '220kV' },
  { type: 'transformer', label: '变压器', defaultName: '主变', width: 44, height: 64, defaultVoltage: '220/110' },
  { type: 'load', label: '负荷', defaultName: '负荷', width: 28, height: 36, defaultVoltage: '110kV' },
  { type: 'powerSource', label: '电源/机组', defaultName: '电源', width: 44, height: 44, defaultVoltage: '220kV' },
]

/** D5000 风格高亮（深色底图） */
export const HIGHLIGHT = {
  fault: '#ff4d4f',
  sourceSide: '#40a9ff',
  loadSide: '#ffa940',
  openSwitch: '#52c41a',
  closedSwitch: '#f5222d',
  power: '#73d13d',
  defaultStroke: '#d9d9d9',
  stationFill: 'rgba(15, 35, 55, 0.55)',
  stationStroke: '#5c7a99',
  canvasDot: '#1f3a52',
  line: '#b8c5d1',
} as const
