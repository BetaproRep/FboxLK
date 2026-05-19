import { dictEnum } from '@/constants/dict'

const STATE_COLORS: Record<string, string> = {
  wait:                  'bg-yellow-100 text-yellow-700',
  canceled:              'bg-gray-100 text-gray-500',
  registering_delivery:  'bg-slate-100 text-slate-600',
  ready_for_assembly:    'bg-sky-100 text-sky-700',
  in_assembly:           'bg-blue-100 text-blue-700',
  assembled:             'bg-indigo-100 text-indigo-700',
  waiting_for_arrival:   'bg-amber-100 text-amber-700',
  palletized:            'bg-teal-100 text-teal-700',
  inwork:                'bg-blue-100 text-blue-700',
  shipped:               'bg-green-100 text-green-700',
}

interface Props {
  state: string
  className?: string
}

export default function OrderStateBadge({ state, className }: Props) {
  return (
    <span className={`badge ${STATE_COLORS[state] ?? 'bg-gray-100 text-gray-600'} ${className ?? ''}`}>
      {dictEnum('order_state', state)}
    </span>
  )
}
