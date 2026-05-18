import type { RoomDef } from './types'

/**
 * フロア共通の SVG 描画。
 * 各 FloorN は自分の rooms を渡してこれを描画するだけ。
 * 本物の図面に差し替えるときは、各 FloorN.tsx の中身（このコンポーネント呼び出し）を
 * その階の本物 SVG に置き換える。rect の id="room-xxx" を維持すれば連携はそのまま動く。
 */
export default function FloorCanvas({
  floor,
  rooms,
  highlightRoomId,
}: {
  floor: number
  rooms: RoomDef[]
  highlightRoomId?: string
}) {
  return (
    <svg
      viewBox="0 0 1000 700"
      width={1000}
      height={700}
      style={{ display: 'block' }}
      role="img"
      aria-label={`${floor}階フロアマップ（仮）`}
    >
      {/* 背景 */}
      <rect x={0} y={0} width={1000} height={700} fill="#0b1020" />
      <rect
        x={20}
        y={20}
        width={960}
        height={660}
        rx={18}
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth={2}
      />

      {/* 階の透かし */}
      <text
        x={760}
        y={250}
        fill="#1e293b"
        fontSize={220}
        fontWeight={800}
        textAnchor="middle"
      >
        {floor}F
      </text>

      {/* L字の廊下（ガイド） */}
      <polyline
        points="190,90 190,620 760,620"
        fill="none"
        stroke="#243049"
        strokeWidth={26}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 部屋 */}
      {rooms.map((r) => {
        const hl = r.id === highlightRoomId
        return (
          <g key={r.id}>
            <rect
              id={r.id}
              className={`room-rect${hl ? ' is-highlight' : ''}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={10}
            />
            <text
              className={`room-label${hl ? ' is-highlight' : ''}`}
              x={r.x + r.w / 2}
              y={r.y + r.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {r.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
