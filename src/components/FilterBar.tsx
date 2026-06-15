import type { ReactNode } from 'react'

export interface Filters {
  maxPrice: number
  units: number // 0 = any
  minScore: number
  newOnly: boolean
  favoritesOnly: boolean
  search: string
  hideHighFlood: boolean
  minYearBuilt: number // 0 = any
  fhaPassOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  maxPrice: 900000,
  units: 0,
  minScore: 0,
  newOnly: false,
  favoritesOnly: false,
  search: '',
  hideHighFlood: false,
  minYearBuilt: 0,
  fhaPassOnly: false,
}

export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <Field label={`Max price: ${(filters.maxPrice / 1000).toFixed(0)}k`}>
        <input
          type="range"
          min={200000}
          max={1200000}
          step={25000}
          value={filters.maxPrice}
          onChange={(e) => set({ maxPrice: Number(e.target.value) })}
        />
      </Field>
      <Field label="Units">
        <select
          className="rounded border border-slate-300 px-2 py-1"
          value={filters.units}
          onChange={(e) => set({ units: Number(e.target.value) })}
        >
          <option value={0}>Any</option>
          <option value={2}>Duplex</option>
          <option value={3}>Triplex</option>
          <option value={4}>Quadplex</option>
        </select>
      </Field>
      <Field label={`Min score: ${filters.minScore}`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minScore}
          onChange={(e) => set({ minScore: Number(e.target.value) })}
        />
      </Field>
      <Field label="Search">
        <input
          className="rounded border border-slate-300 px-2 py-1"
          placeholder="address / zip"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={filters.newOnly}
          onChange={(e) => set({ newOnly: e.target.checked })}
        />{' '}
        New only
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={filters.favoritesOnly}
          onChange={(e) => set({ favoritesOnly: e.target.checked })}
        />{' '}
        ★ Saved
      </label>
      <Field label="Built after">
        <input
          type="number"
          className="w-24 rounded border border-slate-300 px-2 py-1"
          placeholder="any"
          value={filters.minYearBuilt || ''}
          onChange={(e) => set({ minYearBuilt: Number(e.target.value) || 0 })}
        />
      </Field>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={filters.hideHighFlood}
          onChange={(e) => set({ hideHighFlood: e.target.checked })}
        />{' '}
        Hide high flood risk
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={filters.fhaPassOnly}
          onChange={(e) => set({ fhaPassOnly: e.target.checked })}
        />{' '}
        Passes FHA 3–4 unit rule
      </label>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  )
}
