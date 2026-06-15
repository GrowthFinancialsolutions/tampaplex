import type { Computed, Listing } from '../types'
import type { Overrides } from '../lib/favorites'
import { ScoreBadge } from './ScoreBadge'
import { usd, usd2, pct } from '../lib/format'

interface Props {
  listing: Listing
  computed: Computed
  override: Overrides | undefined
  onOverride: (id: string, patch: Overrides) => void
  onClose: () => void
}

export function ListingDetail({ listing, computed, override, onOverride, onClose }: Props) {
  const rent = override?.rentTotal ?? listing.rentTotal
  const ins = override?.insuranceAnnual ?? listing.insuranceAnnual
  const tenantRent = (rent * (listing.units - 1)) / listing.units

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{listing.address}</h2>
            <p className="text-slate-500">
              {listing.units} units · {usd(listing.price)} · rent source: {listing.rentSource}
            </p>
          </div>
          <ScoreBadge score={computed.dealScore} size="lg" />
        </div>

        {!computed.fhaSelfSufficient && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            ⚠️ Fails the FHA 3–4 unit self-sufficiency test (75% of rent must cover PITI). An FHA loan
            likely won't be approved at this rent.
          </p>
        )}

        <section className="mt-5">
          <h3 className="font-semibold text-slate-800">🛋️ Live in one unit</h3>
          <Row label="Tenant rent (other units)" value={`${usd(tenantRent)}/mo`} />
          <Row label="Mortgage (P&I)" value={`${usd(computed.mortgageMonthly)}/mo`} />
          <Row label="FHA MIP" value={`${usd(computed.mipMonthly)}/mo`} />
          <Row
            label="Your out-of-pocket cost"
            value={`${usd(computed.houseHackOutOfPocket)}/mo`}
            highlight
            good={computed.houseHackOutOfPocket <= 0}
          />
          <Row label="% of housing cost covered" value={`${computed.pctCostCovered.toFixed(0)}%`} />
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-slate-800">💰 Rent all units (after you move out)</h3>
          <Row
            label="Monthly cash flow"
            value={`${usd2(computed.fullRentalCashFlow)}/mo`}
            highlight
            good={computed.fullRentalCashFlow >= 0}
          />
          <Row label="Cap rate" value={pct(computed.capRate)} />
          <Row label="Cash-on-cash return" value={pct(computed.cashOnCash)} />
          <Row label="Cash needed to close" value={usd(computed.cashInvested)} />
          <Row label="1% rule (rent ÷ price)" value={pct(computed.onePercent, 2)} />
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-slate-800">Score breakdown</h3>
          <Row label="House-hack (35%)" value={computed.scoreBreakdown.houseHack.toFixed(0)} />
          <Row label="Cash-on-cash (30%)" value={computed.scoreBreakdown.cashOnCash.toFixed(0)} />
          <Row label="Cap rate (20%)" value={computed.scoreBreakdown.capRate.toFixed(0)} />
          <Row label="1% rule (15%)" value={computed.scoreBreakdown.onePercent.toFixed(0)} />
        </section>

        <section className="mt-5 grid grid-cols-2 gap-4">
          <NumberField
            label="Override total rent ($/mo)"
            value={rent}
            onChange={(v) => onOverride(listing.id, { rentTotal: v })}
          />
          <NumberField
            label="Override insurance ($/yr)"
            value={ins}
            onChange={(v) => onOverride(listing.id, { insuranceAnnual: v })}
          />
        </section>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
  good,
}: {
  label: string
  value: string
  highlight?: boolean
  good?: boolean
}) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-1.5 ${highlight ? 'font-bold' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className={good === undefined ? 'text-slate-900' : good ? 'text-emerald-600' : 'text-rose-600'}>
        {value}
      </span>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <input
        type="number"
        className="rounded border border-slate-300 px-2 py-1"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
