/** プレースホルダSVG上の 1 部屋の矩形定義（SVG座標系 viewBox 0 0 1000 700） */
export interface RoomDef {
  /** items.json の roomId と一致させる英数字ID（例 "room-201"） */
  id: string
  x: number
  y: number
  w: number
  h: number
  /** 矩形内に表示するラベル（例 "201"） */
  label: string
}

/** 各フロアコンポーネント共通の props */
export interface FloorProps {
  /** ハイライト対象の部屋ID（検索結果クリック時に渡る） */
  highlightRoomId?: string
}

/**
 * 指定フロアの仮の部屋配置を返す。
 * 左に縦4部屋 + 下に横2部屋の L 字配置。
 * roomId は room-<floor><01..06>。後で本物の図面に差し替える前提。
 */
export function buildRooms(floor: number): RoomDef[] {
  const n = (i: number) => `${floor}${String(i).padStart(2, '0')}`
  return [
    { id: `room-${n(1)}`, x: 80, y: 70, w: 200, h: 120, label: n(1) },
    { id: `room-${n(2)}`, x: 80, y: 205, w: 200, h: 120, label: n(2) },
    { id: `room-${n(3)}`, x: 80, y: 340, w: 200, h: 120, label: n(3) },
    { id: `room-${n(4)}`, x: 80, y: 475, w: 200, h: 120, label: n(4) },
    { id: `room-${n(5)}`, x: 300, y: 475, w: 200, h: 120, label: n(5) },
    { id: `room-${n(6)}`, x: 520, y: 475, w: 200, h: 120, label: n(6) },
  ]
}
