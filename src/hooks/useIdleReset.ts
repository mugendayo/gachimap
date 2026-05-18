import { useEffect, useRef } from 'react'

/**
 * 最後の操作から timeoutMs 経過したら onIdle を呼ぶ。
 * キオスク用途で、次の来場者のために検索状態を自動リセットするのに使う。
 * mousemove は対象外（マウスが少し揺れただけではリセットを止めない）。
 */
export function useIdleReset(timeoutMs: number, onIdle: () => void) {
  const timer = useRef<number | null>(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    const schedule = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => onIdleRef.current(), timeoutMs)
    }
    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'wheel',
      'keydown',
      'touchstart',
    ]
    events.forEach((e) =>
      window.addEventListener(e, schedule, { passive: true })
    )
    schedule()
    return () => {
      events.forEach((e) => window.removeEventListener(e, schedule))
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [timeoutMs])
}
