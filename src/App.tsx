import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from './types'
import { matchItem } from './utils/search'
import { useIdleReset } from './hooks/useIdleReset'
import { FLOOR_COMPONENTS, getFloorLabel } from './components/floors'
import {
  getRoomLabel,
  floorOfRoom,
  isKnownRoom,
} from './components/floors/floorData'
import { APPS_SCRIPT_URL, isLinked, OVERRIDES_POLL_MS } from './config'
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

  // 移動の上書き（スプレッドシート同期分 server / この端末の即時分 local）
  const [serverOverrides, setServerOverrides] = useState<
    Record<string, string>
  >({})
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, string>
  >({})

  const [moveMode, setMoveMode] = useState(false)
  const [movingItemId, setMovingItemId] = useState('')
  const [undo, setUndo] = useState<{
    id: string
    name: string
    prevRoom: string
    toLabel: string
  } | null>(null)
  const undoTimer = useRef<number | null>(null)

  // ---- 備品データの読み込み（公開済み items.json・定期再読込）----
  useEffect(() => {
    let alive = true
    let hasData = false
    const load = async () => {
      try {
        const r = await fetch(
          `${import.meta.env.BASE_URL}items.json?ts=${Date.now()}`,
          { cache: 'no-store' }
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data: Item[] = await r.json()
        if (!alive) return
        setItems(data)
        setLoadError(false)
        hasData = true
      } catch {
        if (alive && !hasData) setLoadError(true)
      }
    }
    load()
    const timer = window.setInterval(load, 5 * 60 * 1000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  // ---- 移動情報の同期（Apps Script から定期取得）----
  useEffect(() => {
    if (!isLinked()) return
    let alive = true
    const pull = async () => {
      try {
        const r = await fetch(`${APPS_SCRIPT_URL}?action=overrides&ts=${Date.now()}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        const map: Record<string, string> =
          data?.overrides ?? (typeof data === 'object' ? data : {})
        if (!alive) return
        setServerOverrides(map)
        // サーバが追いついた分はローカル上書きを解除
        setLocalOverrides((prev) => {
          const next = { ...prev }
          for (const id of Object.keys(next)) {
            if (map[id] === next[id]) delete next[id]
          }
          return next
        })
      } catch {
        /* 一時的な失敗は無視（次のポーリングで回復） */
      }
    }
    pull()
    const timer = window.setInterval(pull, OVERRIDES_POLL_MS)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  // 有効な現在地（local 優先 → server → 元の保管場所）
  const roomOf = useCallback(
    (it: Item): string => {
      const ov = localOverrides[it.id] ?? serverOverrides[it.id]
      return ov && isKnownRoom(ov) ? ov : it.roomId
    },
    [localOverrides, serverOverrides]
  )

  // 表示用：現在地を反映した備品リスト
  const displayItems = useMemo(
    () =>
      items.map((it) => {
        const room = roomOf(it)
        return room === it.roomId
          ? it
          : { ...it, roomId: room, floor: floorOfRoom(room) }
      }),
    [items, roomOf]
  )

  const movedIds = useMemo(() => {
    const s = new Set<string>()
    for (const it of items) if (roomOf(it) !== it.roomId) s.add(it.id)
    return s
  }, [items, roomOf])

  const results = useMemo(
    () => displayItems.filter((it) => matchItem(it, query)),
    [displayItems, query]
  )

  const selectedItem = useMemo(
    () => displayItems.find((it) => it.id === selectedItemId),
    [displayItems, selectedItemId]
  )
  const originalItem = useMemo(
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

  // ---- 移動先への書き戻し ----
  const postMove = (
    it: Item,
    fromRoom: string,
    toRoom: string
  ) => {
    if (!isLinked()) return
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        id: it.id,
        name: it.name,
        from: fromRoom,
        fromLabel: getRoomLabel(fromRoom),
        to: toRoom,
        toLabel: getRoomLabel(toRoom),
        ts: Date.now(),
      }),
      keepalive: true,
    }).catch(() => {
      /* 楽観更新済み。失敗は次回同期で吸収 */
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

  const pickRoom = (roomId: string) => {
    const it = items.find((x) => x.id === movingItemId)
    if (!it) return
    const prevRoom = roomOf(it)
    cancelMove()
    if (roomId === prevRoom) return // 同じ部屋なら何もしない

    setLocalOverrides((prev) => {
      const next = { ...prev }
      // 元の保管場所に戻す & サーバ上書きも無いなら、上書きを消す
      if (roomId === it.roomId && serverOverrides[it.id] === undefined) {
        delete next[it.id]
      } else {
        next[it.id] = roomId
      }
      return next
    })
    setSelectedItemId(it.id)
    setActiveFloor(floorOfRoom(roomId))
    setUndo({
      id: it.id,
      name: it.name,
      prevRoom,
      toLabel: getRoomLabel(roomId),
    })
    clearUndoLater()
    postMove(it, prevRoom, roomId)
  }

  const doUndo = () => {
    if (!undo) return
    const it = items.find((x) => x.id === undo.id)
    if (it) {
      const cur = roomOf(it)
      setLocalOverrides((prev) => {
        const next = { ...prev }
        if (
          undo.prevRoom === it.roomId &&
          serverOverrides[it.id] === undefined
        ) {
          delete next[it.id]
        } else {
          next[it.id] = undo.prevRoom
        }
        return next
      })
      setSelectedItemId(it.id)
      setActiveFloor(floorOfRoom(undo.prevRoom))
      postMove(it, cur, undo.prevRoom)
    }
    setUndo(null)
  }

  const moved =
    selectedItem && originalItem
      ? selectedItem.roomId !== originalItem.roomId
      : false

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
                movedIds={movedIds}
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

          {/* 移動モードのバナー */}
          {moveMode && (
            <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-400/70 bg-slate-900/95 px-6 py-4 shadow-xl">
              <span className="text-xl font-bold text-amber-300">
                「{items.find((x) => x.id === movingItemId)?.name}」の移動先を
                地図でタップ
              </span>
              <button
                onClick={cancelMove}
                className="rounded-lg bg-slate-700 px-4 py-2 text-base font-bold text-slate-100 hover:bg-slate-600"
              >
                キャンセル
              </button>
            </div>
          )}

          {/* 選択中の備品カード */}
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
              {moved && originalItem && (
                <div className="mt-1 text-sm text-amber-300">
                  ※ 移動済み（元の保管: {getRoomLabel(originalItem.roomId)}）
                </div>
              )}
              <div className="mt-1 text-base text-slate-400">
                在庫: {selectedItem.note || '—'}
              </div>
              <button
                onClick={startMove}
                className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-lg font-bold text-black hover:bg-amber-400"
              >
                📍 この備品を移動する
              </button>
              {!isLinked() && (
                <div className="mt-2 text-xs text-slate-500">
                  ※ 連携URL未設定：移動はこの端末内のみ仮反映
                </div>
              )}
            </div>
          )}

          {/* 取り消しスナックバー */}
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
