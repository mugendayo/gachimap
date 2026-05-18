import { FLOOR_TABS } from './floors'

interface Props {
  active: number
  onChange: (floor: number) => void
}

/** 1F / 2F / 3F / 4F / 屋外・他 のフロア切り替えタブ */
export default function FloorTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {FLOOR_TABS.map((t) => {
        const on = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              'rounded-xl px-6 py-3 text-2xl font-bold transition-colors',
              on
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
