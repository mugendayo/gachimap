import type { ComponentType } from 'react'
import type { FloorProps } from './types'
import Floor1 from './Floor1'
import Floor2 from './Floor2'
import Floor3 from './Floor3'
import Floor4 from './Floor4'

/** 階番号 → そのフロアのコンポーネント */
export const FLOOR_COMPONENTS: Record<number, ComponentType<FloorProps>> = {
  1: Floor1,
  2: Floor2,
  3: Floor3,
  4: Floor4,
}

/** タブに出す階の一覧 */
export const FLOORS = [1, 2, 3, 4]
