import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useListings } from './hooks/useListings'
import { recompute } from './lib/refresh-core'
import { DEFAULT_ASSUMPTIONS } from './config/assumptions'
import type { Assumptions, Computed, Listing } from './types'
import { loadStore, saveStore, toggleFavorite, setOverride, type Store } from './lib/favorites'
import { FilterBar, DEFAULT_FILTERS, type Filters } from './components/FilterBar'
import { AssumptionsPanel } from './components/AssumptionsPanel'
import { ListingList } from './components/ListingList'
import { ListingDetail } from './components/ListingDetail'

export default function App() {
  const { data, error } = useListings()
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (data) setAssumptions(data.defaultAssumptions)
  }, [data])
  useEffect(() => {
    saveStore(store)
  }, [store])

  const computedById = useMemo(() => {
    const map = new Map<string, Computed>()
    for (const l of data?.listings ?? []) map.set(l.id, recompute(l, store.overrides[l.id], assumptions))
    return map
  }, [data, store.overrides, assumptions])

  const visible = useMemo(() => {
    const list = (data?.listings ?? []).map((l) => ({ listing: l, computed: computedById.get(l.id)! }))
    const q = filters.search.trim().toLowerCase()
    return list
      .filter(
        ({ listing, computed }) =>
          listing.price <= filters.maxPrice &&
          (filters.units === 0 || listing.units === filters.units) &&
          computed.dealScore >= filters.minScore &&
          (!filters.newOnly || listing.isNew) &&
          (!filters.favoritesOnly || store.favorites.includes(listing.id)) &&
          (q === '' || listing.address.toLowerCase().includes(q) || listing.zip.includes(q)),
      )
      .sort((a, b) => b.computed.dealScore - a.computed.dealScore)
  }, [data, computedById, filters, store.favorites])

  const open = openId ? (data?.listings ?? []).find((l) => l.id === openId) : undefined

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

  return (
    <Shell
      sub={`${data.area} · updated ${new Date(data.generatedAt).toLocaleString()} · ${data.listings.length} listings`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <ListingList
            items={visible}
            favorites={store.favorites}
            onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))}
            onOpen={setOpenId}
          />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <AssumptionsPanel a={assumptions} onChange={setAssumptions} />
        </div>
      </div>

      {open && (
        <ListingDetail
          listing={open as Listing}
          computed={computedById.get(open.id)!}
          override={store.overrides[open.id]}
          onOverride={(id, patch) => setStore((s) => setOverride(s, id, patch))}
          onClose={() => setOpenId(null)}
        />
      )}
    </Shell>
  )
}

function Shell({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">🏠 TampaPlex</h1>
        <p className="text-sm text-slate-500">
          {sub ?? 'Tampa duplex / triplex / quad investment finder'}
        </p>
      </header>
      {children}
    </div>
  )
}
