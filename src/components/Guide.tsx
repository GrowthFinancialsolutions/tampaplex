import { GLOSSARY } from '../lib/explain'
import { TAMPA } from '../lib/tampa'

export function Guide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/40 p-4">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Guide: investing in Tampa plexes</h2>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <section className="mb-5">
          <h3 className="mb-1 font-semibold text-slate-800">What a good Tampa plex looks like</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>
              The other units cover most of your monthly cost — ideally{' '}
              {TAMPA.bands.houseHackCoverage.good}%+.
            </li>
            <li>Cap rate around {(TAMPA.bands.capRate.good * 100).toFixed(0)}% or better for Tampa.</li>
            <li>It would still cash-flow if you moved out and rented every unit.</li>
            <li>
              Insurance and (if applicable) flood costs are confirmed with real quotes, not estimates.
            </li>
            <li>For 3–4 units, it passes the FHA self-sufficiency rule.</li>
          </ul>
        </section>

        <section className="mb-5">
          <h3 className="mb-1 font-semibold text-slate-800">The Tampa reality on costs</h3>
          <p className="text-sm text-slate-600">
            Florida insurance is the biggest surprise for new investors — we model it high on purpose
            (at least ${TAMPA.insuranceFloor.toLocaleString()}/yr). Much of Tampa sits in or near
            flood zones; a flood quote can change a deal entirely. Older homes (pre-2002 code) often
            cost more to insure. None of these should scare you off — they should be verified, not
            ignored.
          </p>
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-slate-800">Plain-English glossary</h3>
          <dl className="space-y-2">
            {Object.values(GLOSSARY).map((g) => (
              <div key={g.term} className="rounded-lg bg-slate-50 p-3">
                <dt className="font-medium text-slate-800">{g.term}</dt>
                <dd className="text-sm text-slate-600">
                  {g.plain}
                  {g.tampaExample ? ` ${g.tampaExample}` : ''}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
