export function Onboarding({ onClose }: { onClose: () => void }) {
  const cards = [
    {
      t: 'House-hacking',
      b: 'Buy a 2–4 unit home, live in one unit, rent the others. Their rent helps pay your mortgage — sometimes all of it.',
    },
    {
      t: 'FHA 3.5% down',
      b: 'If you live there, an FHA loan lets you buy with as little as 3.5% down. A monthly fee called MIP comes with it.',
    },
    {
      t: 'The Deal Score',
      b: 'A 0–100 starting point blending how cheaply you’d live, future cash flow, cap rate, and the 1% rule. A high score is a “look closer,” not a “buy.”',
    },
    {
      t: 'We keep it honest',
      b: 'Numbers are estimates. Tampa insurance and flood risk are modeled high on purpose. Always verify with a lender, inspector, and the city.',
    },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6">
        <h2 className="mb-1 text-xl font-bold text-slate-900">Welcome to TampaPlex 🏠</h2>
        <p className="mb-4 text-sm text-slate-500">A 30-second primer before you dive in.</p>
        <div className="space-y-3">
          {cards.map((c) => (
            <div key={c.t} className="rounded-lg bg-slate-50 p-3">
              <p className="font-semibold text-slate-800">{c.t}</p>
              <p className="text-sm text-slate-600">{c.b}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-white hover:bg-slate-700"
        >
          Got it — show me the deals
        </button>
      </div>
    </div>
  )
}
