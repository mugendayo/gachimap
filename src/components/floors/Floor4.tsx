import FloorCanvas from './FloorCanvas'
import { FLOOR_ROOMS } from './floorData'
import type { FloorProps } from './types'

// 4F フロアマップ。本物の図面ができたらここを差し替える。
export default function Floor4({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas
      floor={4}
      layout={FLOOR_ROOMS[4]}
      highlightRoomId={highlightRoomId}
    />
  )
}
