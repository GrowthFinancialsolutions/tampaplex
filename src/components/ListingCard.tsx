import type { Computed, Listing } from '../types'
import { ScoreBadge } from './ScoreBadge'
import { usd, pct } from '../lib/format'

interface Props {
  listing: Listing
  computed: Computed
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string) => void
}

export function ListingCard({ listing, computed, isFavorite, onToggleFavorite, onOpen }: Props) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {listing.isNew && (
              <span className="rounded bg-sky-600 px-1.5 py-0.5 text-xs font-bold text-white">NEW</span>
            )}
            <h3 className="truncate font-semibold text-slate-900">{listing.address}</h3>
          </div>
          <p className="text-sm text-slate-500">
            {listing.units} units · {listing.beds} bd / {listing.baths} ba ·{' '}
            {listing.sqft.toLocaleString()} sqft
          </p>
        </div>
        <ScoreBadge score={computed.dealScore} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Price" value={usd(listing.price)} />
        <Metric label="Est. rent" value={`${usd(listing.rentTotal)}/mo`} />
        <Metric
          label="Live-in cost"
          value={`${usd(computed.houseHackOutOfPocket)}/mo`}
          good={computed.houseHackOutOfPocket <= 0}
        />
        <Metric label="Cap rate" value={pct(computed.capRate)} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => onToggleFavorite(listing.id)}
          className="text-sm text-slate-500 hover:text-amber-600"
        >
          {isFavorite ? '★ Saved' : '☆ Save'}
        </button>
        <button
          onClick={() => onOpen(listing.id)}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Details
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-semibold ${good ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</div>
    </div>
  )
}
