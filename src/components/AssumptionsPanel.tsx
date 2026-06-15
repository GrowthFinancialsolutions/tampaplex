import type { Assumptions } from '../types'
import { pct } from '../lib/format'

export function AssumptionsPanel({ a, onChange }: { a: Assumptions; onChange: (a: Assumptions) => void }) {
  const set = (patch: Partial<Assumptions>) => onChange({ ...a, ...patch })
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 font-semibold text-slate-900">Your assumptions</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Slider
          label={`Down payment: ${pct(a.downPct, 1)}`}
          min={0.035}
          max={0.25}
          step={0.005}
          value={a.downPct}
          onChange={(v) => set({ downPct: v })}
        />
        <Slider
          label={`Interest rate: ${pct(a.rateAnnual, 2)}`}
          min={0.03}
          max={0.1}
          step={0.00125}
          value={a.rateAnnual}
          onChange={(v) => set({ rateAnnual: v })}
        />
        <Slider
          label={`Vacancy: ${pct(a.vacancyPct)}`}
          min={0}
          max={0.15}
          step={0.01}
          value={a.vacancyPct}
          onChange={(v) => set({ vacancyPct: v })}
        />
        <Slider
          label={`Maintenance: ${pct(a.maintenancePct)}`}
          min={0}
          max={0.15}
          step={0.01}
          value={a.maintenancePct}
          onChange={(v) => set({ maintenancePct: v })}
        />
        <Slider
          label={`CapEx: ${pct(a.capexPct)}`}
          min={0}
          max={0.15}
          step={0.01}
          value={a.capexPct}
          onChange={(v) => set({ capexPct: v })}
        />
        <Slider
          label={`Mgmt (rent-all): ${pct(a.mgmtPct)}`}
          min={0}
          max={0.12}
          step={0.01}
          value={a.mgmtPct}
          onChange={(v) => set({ mgmtPct: v })}
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={a.useFhaMip}
          onChange={(e) => set({ useFhaMip: e.target.checked })}
        />
        Include FHA mortgage insurance (MIP)
      </label>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium text-slate-600">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
