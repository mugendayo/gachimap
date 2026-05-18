/** public/items.json の 1 件分 */
export interface Item {
  /** 一意のID */
  id: string
  /** 表示名（漢字でよい） */
  name: string
  /** ひらがなの読み（検索照合用） */
  reading: string
  /** 置いてある部屋のID（フロアSVGの rect id と一致させる） */
  roomId: string
  /** 階（1〜4） */
  floor: number
  /** カテゴリ名 */
  category: string
  /** 在庫メモ */
  note: string
}
