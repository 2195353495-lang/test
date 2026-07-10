import type { DeviceType } from './types'

export interface SymbolDef {
  type: DeviceType
  label: string
  defaultName: string
  width: number
  height: number
  switchable?: boolean
}

export const SYMBOL_LIBRARY: SymbolDef[] = [
  { type: 'station', label: '变电站', defaultName: '变电站', width: 200, height: 240 },
  { type: 'bus', label: '母线', defaultName: '母线', width: 140, height: 16 },
  { type: 'breaker', label: '断路器', defaultName: '断路器', width: 36, height: 48, switchable: true },
  { type: 'disconnector', label: '刀闸', defaultName: '刀闸', width: 36, height: 40, switchable: true },
  { type: 'transformer', label: '变压器', defaultName: '主变', width: 48, height: 56 },
  { type: 'load', label: '负荷', defaultName: '负荷', width: 40, height: 40 },
  { type: 'powerSource', label: '电源', defaultName: '电源', width: 48, height: 48 },
]

export const HIGHLIGHT = {
  fault: '#c0392b',
  sourceSide: '#2980b9',
  loadSide: '#d35400',
  openSwitch: '#7f8c8d',
  power: '#27ae60',
  defaultStroke: '#2c3e50',
  stationFill: 'rgba(236, 240, 241, 0.55)',
} as const
