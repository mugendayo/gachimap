import type { FloorLayout, RoomDef } from './floorData'

// すべてのフロアで共通の論理キャンバス。MapViewport もこの値を使う（getBBox 1:1）。
export const CANVAS_W = 1680
export const CANVAS_H = 940

const M = 32 // 外周マージン
const VW = 220 // 縦棟の幅
const GAP = 4
const GUTTER = 14 // 縦棟と横棟のすき間

interface Placed extends RoomDef {
  x: number
  y: number
  w: number
  h: number
}

/** 縦棟（左に上から）＋横棟（下に左から右へ）の L 字配置を計算する */
function layoutRooms(layout: FloorLayout): {
  rooms: Placed[]
  cornerY: number
  roomH: number
  hStartX: number
  hEndX: number
} {
  const nv = layout.v.length
  const nh = layout.h.length
  const availH = CANVAS_H - 2 * M
  const roomH = Math.min(76, (availH - (nv - 1) * GAP) / nv)

  const v: Placed[] = layout.v.map((r, i) => ({
    ...r,
    x: M,
    y: M + i * (roomH + GAP),
    w: VW,
    h: roomH,
  }))

  const cornerY = M + (nv - 1) * (roomH + GAP)
  const hStartX = M + VW + GUTTER
  const availW = CANVAS_W - hStartX - M
  const roomW = Math.min(210, (availW - (nh - 1) * GAP) / nh)

  const h: Placed[] = layout.h.map((r, j) => ({
    ...r,
    x: hStartX + j * (roomW + GAP),
    y: cornerY,
    w: roomW,
    h: roomH,
  }))

  return {
    rooms: [...v, ...h],
    cornerY,
    roomH,
    hStartX,
    hEndX: hStartX + nh * (roomW + GAP),
  }
}

/** 部屋名を矩形幅に合わせて折り返す（最大3行、超過分は…） */
function wrapLabel(label: string, w: number): string[] {
  const maxChars = Math.max(4, Math.floor((w - 16) / 17))
  const maxLines = 3
  const lines: string[] = []
  let s = label
  while (s.length > 0 && lines.length < maxLines) {
    if (lines.length === maxLines - 1 && s.length > maxChars) {
      lines.push(s.slice(0, maxChars - 1) + '…')
      s = ''
    } else {
      lines.push(s.slice(0, maxChars))
      s = s.slice(maxChars)
    }
  }
  return lines
}

/**
 * フロア共通の SVG 描画。各 FloorN は自分のレイアウトを渡すだけ。
 * 本物の図面に差し替えるときは各 FloorN.tsx の中身を実SVGに置き換える。
 * rect の id を維持すれば検索連携はそのまま動く。
 */
export default function FloorCanvas({
  floor,
  layout,
  highlightRoomId,
}: {
  floor: number
  layout: FloorLayout
  highlightRoomId?: string
}) {
  const { rooms, cornerY, roomH, hStartX, hEndX } = layoutRooms(layout)
  const corridorY = cornerY - 9

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block' }}
      role="img"
      aria-label={`${floor}階フロアマップ`}
    >
      <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#0b1020" />
      <rect
        x={12}
        y={12}
        width={CANVAS_W - 24}
        height={CANVAS_H - 24}
        rx={18}
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth={2}
      />

      {/* 階の透かし */}
      <text
        x={CANVAS_W - 80}
        y={170}
        fill="#1e293b"
        fontSize={220}
        fontWeight={800}
        textAnchor="end"
      >
        {floor}F
      </text>

      {/* 凡例 */}
      <text x={CANVAS_W - 40} y={CANVAS_H - 28} textAnchor="end" fontSize={22}>
        <tspan fill="#ef4444" fontWeight={700}>
          ■
        </tspan>
        <tspan fill="#94a3b8"> 赤枠＝企画使用不可</tspan>
      </text>

      {/* L字の廊下ガイド */}
      <polyline
        points={`${M + VW + 6},${M + 8} ${M + VW + 6},${corridorY} ${hEndX},${corridorY}`}
        fill="none"
        stroke="#22304d"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 14"
      />

      {/* 部屋 */}
      {rooms.map((r) => {
        const state = highlightRoomId === r.id
          ? 'is-highlight'
          : r.red
            ? 'is-red'
            : ''
        const lines = wrapLabel(r.label, r.w)
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const lh = 20
        const startY = cy - ((lines.length - 1) * lh) / 2
        return (
          <g key={r.id}>
            <rect
              id={r.id}
              className={`room-rect ${state}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={8}
            />
            <text
              className={`room-label ${
                highlightRoomId === r.id ? 'is-highlight' : ''
              }`}
              x={cx}
              y={startY}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {lines.map((ln, i) => (
                <tspan key={i} x={cx} dy={i === 0 ? 0 : lh}>
                  {ln}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}

      {/* 縦棟・横棟の見出し */}
      <text x={M} y={M - 12} fill="#475569" fontSize={18} fontWeight={700}>
        {floor}F
      </text>
      <text
        x={hStartX}
        y={cornerY + roomH + 28}
        fill="#475569"
        fontSize={16}
      >
        ← 横の棟 →
      </text>
    </svg>
  )
}
