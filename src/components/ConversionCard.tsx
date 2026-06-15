import type { Listing } from '../types'
import { neighborhoodForZip, isFloodProneZip } from '../lib/tampa'

const money = (n: number) => '$' + Math.round(n).toLocaleString()

export function ConversionCard(props: {
  listing: Listing
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  const { listing: l } = props
  const hood = neighborhoodForZip(l.zip)
  const floodProne = l.floodZone?.risk === 'high' || (l.floodZone == null && isFloodProneZip(l.zip))

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{l.address}</p>
          <p className="text-xs text-slate-500">
            {l.beds} bd / {l.baths} ba · {l.sqft.toLocaleString()} sqft · {money(l.price)} · {l.zip}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
            Add-a-unit potential
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

      <div className="mb-3 flex gap-2 rounded-lg bg-violet-50 p-3">
        <span aria-hidden className="mt-0.5 text-violet-600">
          🔧
        </span>
        <p className="text-sm leading-relaxed text-violet-900">{l.conversionNote}</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {l.zoning && (
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Zoning: {l.zoning}</span>
        )}
        {l.lotSqft && (
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
            Lot: {l.lotSqft.toLocaleString()} sqft
          </span>
        )}
        {l.yearBuilt && (
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Built {l.yearBuilt}</span>
        )}
        {floodProne && (
          <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">Possible flood zone</span>
        )}
      </div>

      {hood && (
        <p className="mb-3 text-xs text-slate-500">
          {hood.name} — {hood.note}
        </p>
      )}

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800">
        ⚠️ Always verify zoning, lot rules, and what's allowed with the City of Tampa before
        counting on a conversion — and budget for the build. This is a lead, not a guarantee.
      </p>

      {l.listingUrl && (
        <a
          href={l.listingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-sky-700 hover:underline"
        >
          View the listing →
        </a>
      )}
    </div>
  )
}
