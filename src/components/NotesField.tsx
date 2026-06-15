export function NotesField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Your notes</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Showing booked? Questions for the agent? Jot it here — saved on this device."
        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
      />
    </div>
  )
}
