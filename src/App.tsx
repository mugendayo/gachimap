import { useEffect, useMemo, useState } from 'react'
import type { Item } from './types'
import { matchItem } from './utils/search'
import { useIdleReset } from './hooks/useIdleReset'
import { FLOOR_COMPONENTS } from './components/floors'
import MapViewport from './components/MapViewport'
import SearchBar from './components/SearchBar'
import FloorTabs from './components/FloorTabs'
import SearchResults from './components/SearchResults'

const IDLE_MS = 45_000

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loadError, setLoadError] = useState(false)

  const [query, setQuery] = useState('')
  const [activeFloor, setActiveFloor] = useState(1)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [fitSignal, setFitSignal] = useState(0)

  // 備品データの読み込み（ローカル public/items.json のみ）
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}items.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Item[]) => setItems(data))
      .catch(() => setLoadError(true))
  }, [])

  const results = useMemo(
    () => items.filter((it) => matchItem(it, query)),
    [items, query]
  )

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedItemId),
    [items, selectedItemId]
  )

  // 選択中の備品が現在のフロアにあるときだけハイライト/ズーム
  const focusRoomId =
    selectedItem && selectedItem.floor === activeFloor
      ? selectedItem.roomId
      : ''

  const handleSelectItem = (item: Item) => {
    setActiveFloor(item.floor)
    setSelectedItemId(item.id)
  }

  const handleFloorChange = (floor: number) => {
    setActiveFloor(floor)
    setSelectedItemId('')
    setFitSignal((s) => s + 1)
  }

  const resetAll = () => {
    setQuery('')
    setSelectedItemId('')
    setActiveFloor(1)
    setFitSignal((s) => s + 1)
  }

  // 45秒間操作がなければ次の来場者のために自動リセット
  useIdleReset(IDLE_MS, resetAll)

  const FloorComponent = FLOOR_COMPONENTS[activeFloor]

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b1020] text-slate-100">
      {/* ===== 上部: タイトル / タブ / 検索 ===== */}
      <header className="flex flex-col gap-4 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-wide">
              下市集学校 文化祭{' '}
              <span className="text-orange-400">備品案内板</span>
            </h1>
            <p className="text-sm text-slate-400">
              さがしたい備品を入力するか、左の一覧から選んでください
            </p>
          </div>
          <button
            onClick={resetAll}
            className="rounded-xl bg-slate-800 px-5 py-3 text-lg font-bold text-slate-200 hover:bg-slate-700"
          >
            最初に戻る
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <FloorTabs active={activeFloor} onChange={handleFloorChange} />
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </header>

      {/* ===== 中央: 結果リスト + フロアマップ ===== */}
      <main className="flex min-h-0 flex-1">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-bold text-slate-400">
            {query ? `「${query}」の検索結果` : 'すべての備品'}（
            {results.length}件）
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loadError ? (
              <div className="px-4 py-10 text-center text-lg text-red-400">
                備品データ（items.json）を読み込めませんでした。
              </div>
            ) : (
              <SearchResults
                items={results}
                query={query}
                selectedId={selectedItemId}
                onSelect={handleSelectItem}
              />
            )}
          </div>
        </aside>

        <section className="relative min-w-0 flex-1">
          <MapViewport
            floor={activeFloor}
            focusRoomId={focusRoomId}
            fitSignal={fitSignal}
          >
            <FloorComponent highlightRoomId={focusRoomId} />
          </MapViewport>

          {/* 選択中の備品の案内カード */}
          {selectedItem && (
            <div className="pointer-events-none absolute left-5 top-5 max-w-sm rounded-2xl border border-orange-400/60 bg-slate-900/90 p-5 shadow-xl">
              <div className="text-sm font-bold text-orange-400">
                {selectedItem.floor}F ・ {selectedItem.category}
              </div>
              <div className="mt-1 text-3xl font-extrabold text-slate-50">
                {selectedItem.name}
              </div>
              <div className="mt-2 text-lg text-slate-300">
                光っている部屋（{selectedItem.roomId.replace('room-', '')}）に
                あります
              </div>
              <div className="mt-1 text-base text-slate-400">
                在庫: {selectedItem.note}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
