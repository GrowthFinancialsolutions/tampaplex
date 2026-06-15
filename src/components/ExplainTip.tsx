import { useState } from 'react'

export function ExplainTip({
  title,
  body,
  example,
}: {
  title: string
  body: string
  example?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label={`Explain ${title}`}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] leading-none text-slate-500 hover:bg-slate-100"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-1/2 z-20 mt-1 block w-60 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-600 shadow-lg">
          <span className="mb-1 block font-semibold text-slate-800">{title}</span>
          {body}
          {example && <span className="mt-1 block italic text-slate-500">{example}</span>}
        </span>
      )}
    </span>
  )
}
