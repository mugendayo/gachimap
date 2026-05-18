import FloorCanvas from './FloorCanvas'
import { FLOOR_ROOMS } from './floorData'
import type { FloorProps } from './types'

// 2F フロアマップ。本物の図面ができたらここを差し替える。
export default function Floor2({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas
      title="2F"
      layout={FLOOR_ROOMS[2]}
      highlightRoomId={highlightRoomId}
    />
  )
}
