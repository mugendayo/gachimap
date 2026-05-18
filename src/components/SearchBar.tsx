interface Props {
  value: string
  onChange: (v: string) => void
}

/** 検索ボックス。ひらがな/カタカナ/漢字どれで打っても拾える（正規化は呼び出し側）。 */
export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative w-full max-w-2xl">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="さがしたい備品を入力（例: だんぼーる / ペンキ / 脚立）"
        className="w-full rounded-2xl border border-slate-600 bg-slate-900/80 px-6 py-4 text-2xl text-slate-100 placeholder:text-slate-500 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-700 px-4 py-2 text-lg text-slate-200 hover:bg-slate-600"
          aria-label="検索をクリア"
        >
          ✕
        </button>
      )}
    </div>
  )
}
