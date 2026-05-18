import FloorCanvas from './FloorCanvas'
import { FLOOR_ROOMS } from './floorData'
import type { FloorProps } from './types'

// 屋外・その他エリア（屋上・中庭・木工室・校庭ほか）。
// 校舎図ではないので簡易レイアウト。備品はスプレッドシート追加後に取り込む。
export default function Floor5({ highlightRoomId }: FloorProps) {
  return (
    <FloorCanvas
      title="屋外・他"
      layout={FLOOR_ROOMS[5]}
      highlightRoomId={highlightRoomId}
    />
  )
}
