import { scoreTier } from '../config/assumptions'

const TIER_CLASS: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  okay: 'bg-amber-100 text-amber-800 ring-amber-300',
  weak: 'bg-rose-100 text-rose-700 ring-rose-300',
}

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = scoreTier(score)
  const sizeClass =
    size === 'lg' ? 'text-2xl px-4 py-2' : size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ring-1 ${TIER_CLASS[tier]} ${sizeClass}`}
      title={`Deal score: ${tier}`}
    >
      {Math.round(score)}
    </span>
  )
}
