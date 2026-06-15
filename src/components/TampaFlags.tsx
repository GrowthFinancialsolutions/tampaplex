import type { ReactNode } from 'react'
import type { Listing } from '../types'
import { neighborhoodForZip, isFloodProneZip, buildingAgeNote } from '../lib/tampa'

function Flag({ tone, children }: { tone: 'warn' | 'info'; children: ReactNode }) {
  const cls = tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'
  return <div className={`rounded-md px-3 py-2 text-xs leading-snug ${cls}`}>{children}</div>
}

export function TampaFlags({ listing }: { listing: Listing }) {
  const flags: ReactNode[] = []
  const risk = listing.floodZone?.risk
  const floodProne = risk === 'high' || (risk == null && isFloodProneZip(listing.zip))
  if (floodProne) {
    flags.push(
      <Flag key="flood" tone="warn">
        Possible flood zone{listing.floodZone?.zone ? ` (${listing.floodZone.zone})` : ''} — get a
        flood-insurance quote before you make an offer. Verify with the city.
      </Flag>,
    )
  }
  flags.push(
    <Flag key="ins" tone="warn">
      Insurance estimated high at ${listing.insuranceAnnual.toLocaleString()}/yr — Florida’s #1 cost
      surprise. We’d rather warn you than flatter the deal.
    </Flag>,
  )
  const ageNote = buildingAgeNote(listing.yearBuilt)
  if (ageNote)
    flags.push(
      <Flag key="age" tone="warn">
        {ageNote}
      </Flag>,
    )
  const hood = neighborhoodForZip(listing.zip)
  if (hood)
    flags.push(
      <Flag key="hood" tone="info">
        {hood.name} — {hood.note}
      </Flag>,
    )

  return <div className="flex flex-col gap-2">{flags}</div>
}
