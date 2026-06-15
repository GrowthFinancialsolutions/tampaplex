import type { ViewMode } from '../types'

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm">
      {(['simple', 'pro'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`rounded-md px-3 py-1 capitalize ${
            mode === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
