import type { Item } from '../types'

/**
 * 検索照合用にテキストを正規化する。
 * - 全角/半角などを NFKC で揃える
 * - カタカナ（U+30A1〜U+30F6）をひらがなへ変換する
 * - 小文字化・前後空白除去
 *
 * これにより「ペンキ」「ぺんき」「ﾍﾟﾝｷ」がすべて同じ表記に揃い、
 * items.json の reading（ひらがな）と部分一致で照合できる。
 */
export function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    )
    .toLowerCase()
    .trim()
}

/**
 * クエリが備品にヒットするか判定する。
 * reading / name / category を結合した文字列を正規化して部分一致を見る。
 * 漢字で打たれた場合は name（漢字）側で拾える。
 */
export function matchItem(item: Item, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const haystack = normalize(`${item.reading} ${item.name} ${item.category}`)
  return haystack.includes(q)
}
