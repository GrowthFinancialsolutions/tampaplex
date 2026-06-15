import type { Rating } from '../types'
import { ExplainTip } from './ExplainTip'

const DOT: Record<Rating, string> = {
  good: 'text-emerald-600',
  okay: 'text-amber-500',
  concern: 'text-rose-600',
}
const WORD: Record<Rating, string> = { good: 'Good', okay: 'Okay', concern: 'Concern' }

export function MetricTile(props: {
  label: string
  value: string
  rating: Rating
  tipTitle: string
  tipBody: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="mb-1 flex items-center text-xs text-slate-500">
        {props.label}
        <ExplainTip title={props.tipTitle} body={props.tipBody} />
      </p>
      <p className="text-lg font-semibold text-slate-900">{props.value}</p>
      <span className={`text-[11px] ${DOT[props.rating]}`}>● {WORD[props.rating]}</span>
    </div>
  )
}
