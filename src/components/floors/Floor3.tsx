import FloorCanvas from './FloorCanvas'
import { buildRooms, type FloorProps } from './types'

// 3F フロアマップ（仮のプレースホルダ）。本物の図面ができたらここを差し替える。
const rooms = buildRooms(3)

export default function Floor3({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas floor={3} rooms={rooms} highlightRoomId={highlightRoomId} />
  )
}
