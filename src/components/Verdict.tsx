import type { Computed } from '../types'
import { verdict } from '../lib/explain'

export function Verdict({ units, computed }: { units: number; computed: Computed }) {
  const v = verdict({ units, computed })
  return (
    <div className="flex gap-2 rounded-lg bg-sky-50 p-3">
      <span aria-hidden className="mt-0.5 text-sky-600">
        💡
      </span>
      <p className="text-sm leading-relaxed text-sky-900">{v.sentence}</p>
    </div>
  )
}
