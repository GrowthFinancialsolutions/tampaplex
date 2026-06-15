import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useListings } from './hooks/useListings'
import { recompute } from './lib/refresh-core'
import { DEFAULT_ASSUMPTIONS } from './config/assumptions'
import type { Assumptions, Computed, Listing, ViewMode } from './types'
import {
  loadStore,
  saveStore,
  toggleFavorite,
  setOverride,
  setNote,
  setMode,
  setOnboarded,
  type Store,
} from './lib/favorites'
import { favoritesToCsv } from './lib/csv'
import { FilterBar, DEFAULT_FILTERS, type Filters } from './components/FilterBar'
import { AssumptionsPanel } from './components/AssumptionsPanel'
import { ListingList } from './components/ListingList'
import { SimpleListingCard } from './components/SimpleListingCard'
import { ConversionCard } from './components/ConversionCard'
import { ListingDetail } from './components/ListingDetail'
import { ModeToggle } from './components/ModeToggle'
import { Onboarding } from './components/Onboarding'
import { Guide } from './components/Guide'

export default function App() {
  const { data, error } = useListings()
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openId, setOpenId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const mode = store.mode
  const setStoreMode = (m: ViewMode) => setStore((s) => setMode(s, m))

  useEffect(() => {
    if (data) setAssumptions(data.defaultAssumptions)
  }, [data])
  useEffect(() => {
    saveStore(store)
  }, [store])

  const computedById = useMemo(() => {
    const map = new Map<string, Computed>()
    for (const l of data?.listings ?? [])
      map.set(l.id, recompute(l, store.overrides[l.id], assumptions))
    return map
  }, [data, store.overrides, assumptions])

  const allItems = useMemo(
    () => (data?.listings ?? []).map((l) => ({ listing: l, computed: computedById.get(l.id)! })),
    [data, computedById],
  )

  // Filters shared by both categories (price, search, favorites, new, flood, year).
  const baseMatch = (listing: Listing) => {
    const q = filters.search.trim().toLowerCase()
    return (
      listing.price <= filters.maxPrice &&
      (!filters.newOnly || listing.isNew) &&
      (!filters.favoritesOnly || store.favorites.includes(listing.id)) &&
      (q === '' || listing.address.toLowerCase().includes(q) || listing.zip.includes(q)) &&
      (!filters.hideHighFlood || listing.floodZone?.risk !== 'high') &&
      (filters.minYearBuilt === 0 || (listing.yearBuilt ?? 0) >= filters.minYearBuilt)
    )
  }

  const multiItems = useMemo(
    () =>
      allItems
        .filter(
          ({ listing, computed }) =>
            listing.kind !== 'conversion' &&
            baseMatch(listing) &&
            (filters.units === 0 || listing.units === filters.units) &&
            computed.dealScore >= filters.minScore &&
            (!filters.fhaPassOnly || computed.fhaSelfSufficient),
        )
        .sort((a, b) => b.computed.dealScore - a.computed.dealScore),
    [allItems, filters, store.favorites],
  )

  // Conversion candidates aren't scored deals, so they skip the unit/score filters.
  const conversionItems = useMemo(
    () => allItems.filter(({ listing }) => listing.kind === 'conversion' && baseMatch(listing)),
    [allItems, filters, store.favorites],
  )

  const open = openId ? (data?.listings ?? []).find((l) => l.id === openId) : undefined

  function downloadCsv() {
    const favs = (data?.listings ?? []).filter((l) => store.favorites.includes(l.id))
    const blob = new Blob([favoritesToCsv(favs)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tampaplex-favorites.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error)
    return (
      <Shell>
        <p className="text-rose-600">
          Couldn’t load listings: {error}. Run <code>npm run sample</code> (or{' '}
          <code>npm run refresh</code> with a RentCast key).
        </p>
      </Shell>
    )
  if (!data)
    return (
      <Shell>
        <p className="text-slate-400">Loading…</p>
      </Shell>
    )

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <ModeToggle mode={mode} onChange={setStoreMode} />
      <button
        onClick={() => setShowGuide(true)}
        className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
      >
        Guide
      </button>
      <button
        onClick={downloadCsv}
        disabled={store.favorites.length === 0}
        className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        Export ★ (CSV)
      </button>
    </div>
  )

  return (
    <Shell
      controls={controls}
      sub={`${data.area} · updated ${new Date(data.generatedAt).toLocaleString()} · ${data.listings.length} listings`}
    >
      <div className={`grid gap-4 ${mode === 'pro' ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div className="space-y-4">
          <FilterBar filters={filters} onChange={setFilters} />
          {mode === 'simple' ? (
            <div className="space-y-3">
              {multiItems.map(({ listing, computed }) => (
                <SimpleListingCard
                  key={listing.id}
                  listing={listing}
                  computed={computed}
                  isFavorite={store.favorites.includes(listing.id)}
                  onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))}
                  onOpen={setOpenId}
                />
              ))}
              {multiItems.length === 0 && (
                <p className="py-12 text-center text-slate-400">No listings match your filters.</p>
              )}
            </div>
          ) : (
            <ListingList
              items={multiItems}
              favorites={store.favorites}
              onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))}
              onOpen={setOpenId}
            />
          )}

          {conversionItems.length > 0 && (
            <section className="space-y-3">
              <div className="border-t border-slate-200 pt-4">
                <h2 className="font-semibold text-slate-800">🔧 Homes you could add a unit to</h2>
                <p className="text-sm text-slate-500">
                  Single-family homes that may allow a second unit (ADU or duplex conversion) so you
                  could house-hack — candidates to investigate, not scored deals. Verify with the
                  City of Tampa.
                </p>
              </div>
              {conversionItems.map(({ listing }) => (
                <ConversionCard
                  key={listing.id}
                  listing={listing}
                  isFavorite={store.favorites.includes(listing.id)}
                  onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))}
                />
              ))}
            </section>
          )}
        </div>
        {mode === 'pro' && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <AssumptionsPanel a={assumptions} onChange={setAssumptions} />
          </div>
        )}
      </div>

      {open && (
        <ListingDetail
          listing={open as Listing}
          computed={computedById.get(open.id)!}
          assumptions={assumptions}
          override={store.overrides[open.id]}
          onOverride={(id, patch) => setStore((s) => setOverride(s, id, patch))}
          note={store.notes[open.id] ?? ''}
          onNote={(id, v) => setStore((s) => setNote(s, id, v))}
          onClose={() => setOpenId(null)}
        />
      )}

      {!store.onboarded && <Onboarding onClose={() => setStore((s) => setOnboarded(s, true))} />}
      {showGuide && <Guide onClose={() => setShowGuide(false)} />}
    </Shell>
  )
}

function Shell({
  children,
  sub,
  controls,
}: {
  children: ReactNode
  sub?: string
  controls?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">🏠 TampaPlex</h1>
          <p className="text-sm text-slate-500">
            {sub ?? 'Tampa duplex / triplex / quad investment finder'}
          </p>
        </div>
        {controls}
      </header>
      {children}
    </div>
  )
}
