import { FLOORS } from './floors'

interface Props {
  active: number
  onChange: (floor: number) => void
}

/** 1F / 2F / 3F / 4F のフロア切り替えタブ */
export default function FloorTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {FLOORS.map((f) => {
        const on = f === active
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={[
              'rounded-xl px-6 py-3 text-2xl font-bold transition-colors',
              on
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            ].join(' ')}
          >
            {f}F
          </button>
        )
      })}
    </div>
  )
}
