import type { ComponentType } from 'react'
import type { FloorProps } from './types'
import Floor1 from './Floor1'
import Floor2 from './Floor2'
import Floor3 from './Floor3'
import Floor4 from './Floor4'
import Floor5 from './Floor5'

export interface FloorTab {
  /** items.json の floor 値と一致させるキー */
  key: number
  /** タブに表示する名前 */
  label: string
}

/** タブに出すフロアの一覧（順序＝表示順） */
export const FLOOR_TABS: FloorTab[] = [
  { key: 1, label: '1F' },
  { key: 2, label: '2F' },
  { key: 3, label: '3F' },
  { key: 4, label: '4F' },
  { key: 5, label: '屋外・他' },
]

/** floor 値 → タブ表示名（例 1→"1F", 5→"屋外・他"） */
export function getFloorLabel(floor: number): string {
  return FLOOR_TABS.find((t) => t.key === floor)?.label ?? `${floor}F`
}

/** フロアキー → そのフロアのコンポーネント */
export const FLOOR_COMPONENTS: Record<number, ComponentType<FloorProps>> = {
  1: Floor1,
  2: Floor2,
  3: Floor3,
  4: Floor4,
  5: Floor5,
}
