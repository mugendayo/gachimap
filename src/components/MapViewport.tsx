import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// フロアSVGの内部座標（viewBox）と一致させた論理サイズ。
// FloorCanvas が width=1000 height=700 / viewBox 0 0 1000 700 で描くので
// この層の 1px = SVGユーザー単位 となり getBBox() の値をそのまま使える。
const CONTENT_W = 1000
const CONTENT_H = 700
const MIN_SCALE = 0.2
const MAX_SCALE = 6
const EASE = 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)'

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

interface Transform {
  scale: number
  x: number
  y: number
}

type Intent =
  | { type: 'fit' }
  | { type: 'focus'; roomId: string }
  | { type: 'manual' }

interface Props {
  /** 現在表示中の階（変わったら配置をやり直すトリガ） */
  floor: number
  /** フォーカスする部屋ID。空なら全体表示 */
  focusRoomId?: string
  /** インクリメントすると全体表示にリセットする */
  fitSignal: number
  children: ReactNode
}

/**
 * フロアマップのビューポート。
 * - マウスホイールでカーソル位置を中心にズーム
 * - ドラッグでパン
 * - focusRoomId が来たら該当部屋へ滑らかにズーム移動
 * - fitSignal が変わったら全体表示へ戻る
 */
export default function MapViewport({
  floor,
  focusRoomId,
  fitSignal,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const intentRef = useRef<Intent>({ type: 'fit' })

  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const [animated, setAnimated] = useState(true)

  // 全体表示
  const applyFit = useCallback((withAnim: boolean) => {
    const c = containerRef.current
    if (!c) return
    const cw = c.clientWidth
    const ch = c.clientHeight
    if (cw === 0 || ch === 0) return
    const scale = Math.min(cw / CONTENT_W, ch / CONTENT_H) * 0.94
    setAnimated(withAnim)
    setT({
      scale,
      x: (cw - CONTENT_W * scale) / 2,
      y: (ch - CONTENT_H * scale) / 2,
    })
  }, [])

  // 指定部屋へズーム（フロア切替直後は要素未生成のことがあるので数フレーム再試行）
  const applyFocus = useCallback(
    (roomId: string, withAnim: boolean, tries = 0) => {
      const c = containerRef.current
      const inner = innerRef.current
      if (!c || !inner) return
      const el = inner.querySelector<SVGGraphicsElement>(
        `#${CSS.escape(roomId)}`
      )
      if (!el || typeof el.getBBox !== 'function') {
        if (tries < 12) {
          requestAnimationFrame(() =>
            applyFocus(roomId, withAnim, tries + 1)
          )
        }
        return
      }
      const bb = el.getBBox()
      if (bb.width === 0 || bb.height === 0) {
        if (tries < 12) {
          requestAnimationFrame(() =>
            applyFocus(roomId, withAnim, tries + 1)
          )
        }
        return
      }
      const cw = c.clientWidth
      const ch = c.clientHeight
      const pad = 2.4 // 部屋まわりの余白係数（大きいほど引き）
      const scale = clamp(
        Math.min(cw / (bb.width * pad), ch / (bb.height * pad)),
        0.4,
        MAX_SCALE
      )
      const cx = bb.x + bb.width / 2
      const cy = bb.y + bb.height / 2
      setAnimated(withAnim)
      setT({
        scale,
        x: cw / 2 - cx * scale,
        y: ch / 2 - cy * scale,
      })
    },
    []
  )

  // focusRoomId / floor / fitSignal の変化に応じて配置をやり直す
  useLayoutEffect(() => {
    if (focusRoomId) {
      intentRef.current = { type: 'focus', roomId: focusRoomId }
      applyFocus(focusRoomId, true)
    } else {
      intentRef.current = { type: 'fit' }
      applyFit(true)
    }
  }, [focusRoomId, floor, fitSignal, applyFit, applyFocus])

  // コンテナのサイズ変化に追従（キオスクの初回レイアウト確定にも対応）
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const ro = new ResizeObserver(() => {
      const it = intentRef.current
      if (it.type === 'focus') applyFocus(it.roomId, false)
      else if (it.type === 'fit') applyFit(false)
    })
    ro.observe(c)
    return () => ro.disconnect()
  }, [applyFit, applyFocus])

  // ホイールズーム（カーソル位置を固定点にする / passive:false が必要）
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = c.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      intentRef.current = { type: 'manual' }
      setAnimated(false)
      setT((prev) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
        const ns = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE)
        const lx = (mx - prev.x) / prev.scale
        const ly = (my - prev.y) / prev.scale
        return { scale: ns, x: mx - lx * ns, y: my - ly * ns }
      })
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [])

  // ドラッグでパン
  const drag = useRef<{
    active: boolean
    sx: number
    sy: number
    ox: number
    oy: number
  }>({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      ox: t.x,
      oy: t.y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setAnimated(false)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    intentRef.current = { type: 'manual' }
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    setT((prev) => ({
      ...prev,
      x: drag.current.ox + dx,
      y: drag.current.oy + dy,
    }))
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    drag.current.active = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  // ＋ / − ボタン（画面中心を固定点にズーム）
  const zoomBy = (factor: number) => {
    const c = containerRef.current
    if (!c) return
    const cw = c.clientWidth
    const ch = c.clientHeight
    intentRef.current = { type: 'manual' }
    setAnimated(true)
    setT((prev) => {
      const ns = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE)
      const lx = (cw / 2 - prev.x) / prev.scale
      const ly = (ch / 2 - prev.y) / prev.scale
      return { scale: ns, x: cw / 2 - lx * ns, y: ch / 2 - ly * ns }
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#0b1020]"
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div
        ref={innerRef}
        style={{
          width: CONTENT_W,
          height: CONTENT_H,
          transformOrigin: '0 0',
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
          transition: animated ? EASE : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>

      {/* ズーム操作ボタン（マウス操作のキオスク向け補助） */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-2">
        <button
          onClick={() => zoomBy(1.3)}
          className="h-12 w-12 rounded-xl bg-slate-800/90 text-2xl font-bold text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-700"
          aria-label="拡大"
        >
          ＋
        </button>
        <button
          onClick={() => zoomBy(1 / 1.3)}
          className="h-12 w-12 rounded-xl bg-slate-800/90 text-2xl font-bold text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-700"
          aria-label="縮小"
        >
          －
        </button>
        <button
          onClick={() => {
            intentRef.current = { type: 'fit' }
            applyFit(true)
          }}
          className="h-12 w-12 rounded-xl bg-slate-800/90 text-xs font-bold text-slate-100 shadow-lg ring-1 ring-slate-600 hover:bg-slate-700"
          aria-label="全体表示"
        >
          全体
        </button>
      </div>
    </div>
  )
}
