import FloorCanvas from './FloorCanvas'
import { FLOOR_ROOMS } from './floorData'
import type { FloorProps } from './types'

// 3F フロアマップ。本物の図面ができたらここを差し替える。
export default function Floor3({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas
      title="3F"
      layout={FLOOR_ROOMS[3]}
      highlightRoomId={highlightRoomId}
    />
  )
}
