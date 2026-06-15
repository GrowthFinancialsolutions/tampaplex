import type { Computed, Listing } from '../types'
import { scoreTier } from '../config/assumptions'
import { assessAll } from '../lib/explain'
import { Verdict } from './Verdict'
import { MetricTile } from './MetricTile'
import { TampaFlags } from './TampaFlags'

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const TIER_BADGE: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-800',
  okay: 'bg-amber-100 text-amber-800',
  weak: 'bg-rose-100 text-rose-800',
}
const TIER_WORD: Record<string, string> = {
  strong: 'Strong deal',
  okay: 'Worth a look',
  weak: 'Probably skip',
}

export function SimpleListingCard(props: {
  listing: Listing
  computed: Computed
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string) => void
}) {
  const { listing: l, computed: c } = props
  const tier = scoreTier(c.dealScore)
  const a = Object.fromEntries(assessAll(c).map((x) => [x.key, x]))

  const tileValues: Record<string, string> = {
    houseHackCoverage:
      c.houseHackOutOfPocket <= 0 ? 'Free' : money(c.houseHackOutOfPocket) + '/mo',
    cashFlow: (c.fullRentalCashFlow >= 0 ? '+' : '') + money(c.fullRentalCashFlow) + '/mo',
    capRate: (c.capRate * 100).toFixed(1) + '%',
    onePercent: (c.onePercent * 100).toFixed(2) + '%',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {l.isNew && (
              <span className="rounded bg-sky-600 px-1.5 py-0.5 text-xs font-bold text-white">
                NEW
              </span>
            )}
            <p className="truncate font-semibold text-slate-900">{l.address}</p>
          </div>
          <p className="text-xs text-slate-500">
            {l.units}-unit · {money(l.price)} · {l.zip}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${TIER_BADGE[tier]}`}
          >
            {Math.round(c.dealScore)} · {TIER_WORD[tier]}
          </span>
          <button
            aria-label={props.isFavorite ? 'Remove favorite' : 'Save favorite'}
            onClick={() => props.onToggleFavorite(l.id)}
            className={props.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'}
          >
            ★
          </button>
        </div>
      </div>

      <div className="mb-4">
        <Verdict units={l.units} computed={c} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['houseHackCoverage', 'cashFlow', 'capRate', 'onePercent'] as const).map((k) => (
          <MetricTile
            key={k}
            label={a[k].label}
            value={tileValues[k]}
            rating={a[k].rating}
            tipTitle={a[k].label}
            tipBody={a[k].why}
          />
        ))}
      </div>

      <div className="mb-4">
        <TampaFlags listing={l} />
      </div>

      <button onClick={() => props.onOpen(l.id)} className="text-sm text-sky-700 hover:underline">
        See the full math &amp; adjust assumptions →
      </button>
    </div>
  )
}
