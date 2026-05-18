import FloorCanvas from './FloorCanvas'
import { FLOOR_ROOMS } from './floorData'
import type { FloorProps } from './types'

// 1F フロアマップ。本物の図面ができたら、この return の中身を 1F の実SVGに
// 差し替える。rect の id="r1-xx" を維持すれば検索連携はそのまま動く。
export default function Floor1({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas
      title="1F"
      layout={FLOOR_ROOMS[1]}
      highlightRoomId={highlightRoomId}
    />
  )
}
