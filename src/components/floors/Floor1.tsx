import FloorCanvas from './FloorCanvas'
import { buildRooms, type FloorProps } from './types'

// 1F フロアマップ（仮のプレースホルダ）。
// 本物の図面ができたら、この return の中身を 1F の実SVGに差し替える。
// rect に id="room-1xx" を付けたままにすれば検索連携はそのまま動く。
const rooms = buildRooms(1)

export default function Floor1({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas floor={1} rooms={rooms} highlightRoomId={highlightRoomId} />
  )
}
