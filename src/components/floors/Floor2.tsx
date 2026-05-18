import FloorCanvas from './FloorCanvas'
import { buildRooms, type FloorProps } from './types'

// 2F フロアマップ（仮のプレースホルダ）。本物の図面ができたらここを差し替える。
const rooms = buildRooms(2)

export default function Floor2({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas floor={2} rooms={rooms} highlightRoomId={highlightRoomId} />
  )
}
