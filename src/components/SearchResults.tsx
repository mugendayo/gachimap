import type { Item } from '../types'
import { getFloorLabel } from './floors'
import { getRoomLabel } from './floors/floorData'

interface Props {
  items: Item[]
  query: string
  selectedId: string
  onSelect: (item: Item) => void
  /** 移動済み（元の保管場所と違う）備品IDの集合 */
  movedIds?: Set<string>
}

/** 検索結果（備品リスト）。クリックで該当フロア＋部屋へ案内する。 */
export default function SearchResults({
  items,
  query,
  selectedId,
  onSelect,
  movedIds,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-lg text-slate-400">
        「{query}」に一致する備品は見つかりませんでした。
        <br />
        ひらがなでも検索できます。
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const on = item.id === selectedId
        const moved = movedIds?.has(item.id) ?? false
        return (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item)}
              className={[
                'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                on
                  ? 'border-orange-400 bg-orange-500/20'
                  : 'border-slate-700 bg-slate-800/60 hover:bg-slate-700/70',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-slate-50">
                  {item.name}
                </span>
                <span className="shrink-0 rounded-md bg-orange-500 px-2 py-0.5 text-base font-bold text-white">
                  {getFloorLabel(item.floor)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                {moved && (
                  <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-xs font-bold text-black">
                    移動済み
                  </span>
                )}
                <span>
                  {moved
                    ? `現在地: ${getRoomLabel(item.roomId)}`
                    : item.category}
                  {item.note ? ` ・ ${item.note}` : ''}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
