import FloorCanvas from './FloorCanvas'
import { buildRooms, type FloorProps } from './types'

// 4F フロアマップ（仮のプレースホルダ）。本物の図面ができたらここを差し替える。
const rooms = buildRooms(4)

export default function Floor4({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas floor={4} rooms={rooms} highlightRoomId={highlightRoomId} />
  )
}
