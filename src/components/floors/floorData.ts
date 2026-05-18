// 下市集学校の実在の校舎図に準拠した教室データ。
// 各フロアは「縦の棟（v: 左側に上から下へ）」＋「下の横棟（h: 左から右へ）」のL字。
// red: true は『赤枠教室＝企画使用不可』。
// roomId は items.json の roomId / フロアSVGの rect id と一致させる安定キー。

export interface RoomDef {
  id: string
  label: string
  red?: boolean
}

export interface FloorLayout {
  /** 縦の棟（上から下へ） */
  v: RoomDef[]
  /** 下の横棟（左から右へ。先頭は縦棟の最下段＝曲がり角に接続） */
  h: RoomDef[]
}

export const FLOOR_ROOMS: Record<number, FloorLayout> = {
  1: {
    v: [
      { id: 'r1-01', label: '階段' },
      { id: 'r1-02', label: '給食室' },
      { id: 'r1-03', label: '休憩室' },
      { id: 'r1-04', label: '食庫' },
      { id: 'r1-05', label: 'トイレ男' },
      { id: 'r1-06', label: 'トイレ女' },
      { id: 'r1-07', label: '相談室1 地域の人', red: true },
      { id: 'r1-08', label: '相談室2' },
      { id: 'r1-09', label: '保健室' },
      { id: 'r1-10', label: 'ホール' },
      { id: 'r1-11', label: '昇降口' },
    ],
    h: [
      { id: 'r1-12', label: '玄関' },
      { id: 'r1-13', label: '事務室 リングロー', red: true },
      { id: 'r1-14', label: '職員室 職員・実行委員・少年PJ', red: true },
      { id: 'r1-15', label: '放送室' },
      { id: 'r1-16', label: '校長室' },
      { id: 'r1-17', label: '会議室' },
      { id: 'r1-18', label: 'トイレ' },
      { id: 'r1-19', label: '階段' },
    ],
  },
  2: {
    v: [
      { id: 'r2-01', label: '階段' },
      { id: 'r2-02', label: '被服室・被服準備室' },
      { id: 'r2-03', label: '被服室' },
      { id: 'r2-04', label: '階段' },
      { id: 'r2-05', label: 'トイレ' },
      { id: 'r2-06', label: 'トイレ' },
      { id: 'r2-07', label: '教室6年' },
      { id: 'r2-08', label: '1-2 暖房あり' },
      { id: 'r2-09', label: '1-1 暖房あり' },
    ],
    h: [
      { id: 'r2-10', label: '男子更衣室' },
      { id: 'r2-11', label: '調理準備室' },
      { id: 'r2-12', label: '調理室' },
      { id: 'r2-13', label: 'カウンセリング室' },
      { id: 'r2-14', label: '生徒会室' },
      { id: 'r2-15', label: '図書室' },
      { id: 'r2-16', label: '女子更衣室' },
      { id: 'r2-17', label: '階段' },
    ],
  },
  3: {
    v: [
      { id: 'r3-01', label: '階段' },
      { id: 'r3-02', label: '社会科資料室' },
      { id: 'r3-03', label: '理科準備室' },
      { id: 'r3-04', label: '理科室' },
      { id: 'r3-05', label: '階段' },
      { id: 'r3-06', label: 'トイレ' },
      { id: 'r3-07', label: 'トイレ' },
      { id: 'r3-08', label: '教室1A 暖房あり' },
      { id: 'r3-09', label: '2-2' },
      { id: 'r3-10', label: '2-1 暖房あり' },
    ],
    h: [
      { id: 'r3-11', label: '仲良し教室1' },
      { id: 'r3-12', label: '仲良し教室2' },
      { id: 'r3-13', label: '視聴覚室 70人 女子寝室/暖房あり', red: true },
      { id: 'r3-14', label: '視聴覚準備室' },
      { id: 'r3-15', label: 'コンピュータ準備室' },
      { id: 'r3-16', label: 'コンピュータ室' },
      { id: 'r3-17', label: '美術室' },
      { id: 'r3-18', label: '階段' },
    ],
  },
  4: {
    v: [
      { id: 'r4-01', label: '給食リフト' },
      { id: 'r4-02', label: '階段' },
      { id: 'r4-03', label: 'トイレ' },
      { id: 'r4-04', label: 'トイレ' },
      { id: 'r4-05', label: 'トンボ教室' },
      { id: 'r4-06', label: '3-2' },
      { id: 'r4-07', label: '3-1 暖房あり' },
    ],
    h: [
      { id: 'r4-08', label: '吹奏楽器室' },
      { id: 'r4-09', label: '音楽準備室' },
      { id: 'r4-10', label: '音楽室1 50人 男子寝室', red: true },
      { id: 'r4-11', label: '音楽室2' },
    ],
  },
}

const LABEL_BY_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  Object.values(FLOOR_ROOMS).forEach((fl) =>
    [...fl.v, ...fl.h].forEach((r) => {
      m[r.id] = r.label
    })
  )
  return m
})()

/** roomId から表示用の部屋名を引く（未知IDはそのまま返す） */
export function getRoomLabel(id: string): string {
  return LABEL_BY_ID[id] ?? id
}
