import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from './types'
import { matchItem } from './utils/search'
import { useIdleReset } from './hooks/useIdleReset'
import { FLOOR_COMPONENTS, getFloorLabel } from './components/floors'
import { getRoomLabel, floorOfRoom } from './components/floors/floorData'
import { APPS_SCRIPT_URL, isLinked, CATALOG_POLL_MS } from './config'
import MapViewport from './components/MapViewport'
import SearchBar from './components/SearchBar'
import FloorTabs from './components/FloorTabs'
import SearchResults from './components/SearchResults'

const IDLE_MS = 45_000
const UNDO_MS = 7_000

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loadError, setLoadError] = useState(false)

  const [query, setQuery] = useState('')
  const [activeFloor, setActiveFloor] = useState(1)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [fitSignal, setFitSignal] = useState(0)

  const [moveMode, setMoveMode] = useState(false)
  const [movingItemId, setMovingItemId] = useState('')
  const [undo, setUndo] = useState<{
    name: string
    note: string
    prevRoomId: string
    prevFloor: number
    toLabel: string
  } | null>(null)
  const undoTimer = useRef<number | null>(null)

  // ---- カタログ取得 ----
  // 連携時はスプレッドシート（部屋別タブ）を Apps Script 経由で直接読む。
  // 手編集もキオスクの移動も、ここを定期取得することで全端末に反映。
  // 取得失敗時は最後に取れた内容を保持。初回は同梱 items.json で素早く表示。
  useEffect(() => {
    let alive = true
    let hasData = false

    const fromBundle = async () => {
      try {
        const r = await fetch(
          `${import.meta.env.BASE_URL}items.json?ts=${Date.now()}`,
          { cache: 'no-store' }
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data: Item[] = await r.json()
        if (alive && !hasData) {
          setItems(data)
          setLoadError(false)
        }
      } catch {
        if (alive && !hasData) setLoadError(true)
      }
    }

    const fromCatalog = async () => {
      if (!isLinked()) return fromBundle()
      try {
        const r = await fetch(`${APPS_SCRIPT_URL}?v=${Date.now()}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        if (!data?.ok || !Array.isArray(data.items)) throw new Error('bad')
        if (!alive) return
        setItems(data.items as Item[])
        setLoadError(false)
        hasData = true
      } catch {
        if (alive && !hasData) await fromBundle()
      }
    }

    // 初回は素早く同梱データ→すぐカタログで上書き、その後定期更新
    fromBundle().then(fromCatalog)
    const timer = window.setInterval(fromCatalog, CATALOG_POLL_MS)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  const results = useMemo(
    () => items.filter((it) => matchItem(it, query)),
    [items, query]
  )

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedItemId),
    [items, selectedItemId]
  )

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
    if (!moveMode) {
      setSelectedItemId('')
      setFitSignal((s) => s + 1)
    }
  }

  const cancelMove = () => {
    setMoveMode(false)
    setMovingItemId('')
  }

  const resetAll = useCallback(() => {
    setQuery('')
    setSelectedItemId('')
    setActiveFloor(1)
    setFitSignal((s) => s + 1)
    setMoveMode(false)
    setMovingItemId('')
  }, [])

  useIdleReset(IDLE_MS, resetAll)

  const FloorComponent = FLOOR_COMPONENTS[activeFloor] ?? FLOOR_COMPONENTS[1]

  // スプレッドシートへ移動を書き戻す（元タブ削除→移動先タブ追記）
  const postMove = (
    it: Item,
    toRoomId: string,
    toRoomLabel: string,
    toFloor: number
  ) => {
    if (!isLinked()) return
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        name: it.name,
        note: it.note,
        fromTab: it.tab || '',
        toRoomId,
        toRoomLabel,
        toFloor,
      }),
      keepalive: true,
    }).catch(() => {
      /* 楽観更新済み。失敗しても次回カタログ取得で整合 */
    })
  }

  const startMove = () => {
    if (!selectedItemId) return
    setMovingItemId(selectedItemId)
    setMoveMode(true)
  }

  const clearUndoLater = () => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  // 楽観的にローカルの所在を書き換える
  const relocate = (itemId: string, roomId: string) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              roomId,
              floor: floorOfRoom(roomId),
              category: getRoomLabel(roomId),
              tab: undefined,
            }
          : it
      )
    )

  const pickRoom = (roomId: string) => {
    const it = items.find((x) => x.id === movingItemId)
    if (!it) return
    const prevRoomId = it.roomId
    cancelMove()
    if (roomId === prevRoomId) return

    const toLabel = getRoomLabel(roomId)
    const toFloor = floorOfRoom(roomId)
    relocate(it.id, roomId)
    setSelectedItemId(it.id)
    setActiveFloor(toFloor)
    setUndo({
      name: it.name,
      note: it.note,
      prevRoomId,
      prevFloor: it.floor,
      toLabel,
    })
    clearUndoLater()
    postMove(it, roomId, toLabel, toFloor)
  }

  const doUndo = () => {
    if (!undo) return
    const it = items.find((x) => x.name === undo.name)
    if (it) {
      relocate(it.id, undo.prevRoomId)
      setSelectedItemId(it.id)
      setActiveFloor(undo.prevFloor)
      postMove(
        { ...it, tab: undefined },
        undo.prevRoomId,
        getRoomLabel(undo.prevRoomId),
        undo.prevFloor
      )
    }
    setUndo(null)
  }

  const movingItem = items.find((x) => x.id === movingItemId)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b1020] text-slate-100">
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

      <main className="flex min-h-0 flex-1">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-bold text-slate-400">
            {query ? `「${query}」の検索結果` : 'すべての備品'}（
            {results.length}件）
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loadError && items.length === 0 ? (
              <div className="px-4 py-10 text-center text-lg text-red-400">
                備品データを読み込めませんでした。
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
            moveMode={moveMode}
            onPickRoom={pickRoom}
          >
            <FloorComponent highlightRoomId={focusRoomId} />
          </MapViewport>

          {moveMode && (
            <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-400/70 bg-slate-900/95 px-6 py-4 shadow-xl">
              <span className="text-xl font-bold text-amber-300">
                「{movingItem?.name}」の移動先を地図でタップ
              </span>
              <button
                onClick={cancelMove}
                className="rounded-lg bg-slate-700 px-4 py-2 text-base font-bold text-slate-100 hover:bg-slate-600"
              >
                キャンセル
              </button>
            </div>
          )}

          {selectedItem && !moveMode && (
            <div className="absolute left-5 top-5 max-w-sm rounded-2xl border border-orange-400/60 bg-slate-900/90 p-5 shadow-xl">
              <div className="text-sm font-bold text-orange-400">
                {getFloorLabel(selectedItem.floor)} ・ {selectedItem.category}
              </div>
              <div className="mt-1 text-3xl font-extrabold text-slate-50">
                {selectedItem.name}
              </div>
              <div className="mt-2 text-lg text-slate-300">
                光っている部屋「{getRoomLabel(selectedItem.roomId)}」に
                あります
              </div>
              <div className="mt-1 text-base text-slate-400">
                在庫: {selectedItem.note || '—'}
              </div>
              <button
                onClick={startMove}
                className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-lg font-bold text-black hover:bg-amber-400"
              >
                📍 この備品を移動する
              </button>
            </div>
          )}

          {undo && (
            <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-slate-600 bg-slate-900/95 px-6 py-4 shadow-xl">
              <span className="text-lg text-slate-100">
                「{undo.name}」を{' '}
                <span className="font-bold text-amber-300">
                  {undo.toLabel}
                </span>{' '}
                に移動しました
              </span>
              <button
                onClick={doUndo}
                className="rounded-lg bg-slate-700 px-4 py-2 text-base font-bold text-slate-100 hover:bg-slate-600"
              >
                取り消す
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
