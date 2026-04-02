import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import type { OrderDetail } from '@/types/order'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { FIELDS } from '@/constants/fields'

const STATE_LABELS: Record<string, string> = {
  wait: 'Ожидание',
  canceled: 'Отменён',
  inwork: 'В работе',
  shipped: 'Отгружен',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const orderId = id!

  const { data: orderResp, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
  })

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel([orderId]),
    onSuccess: () => {
      toast.success('Заказ отменён')
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-primary-600" /></div>
  }

  const order = orderResp?.order as OrderDetail | undefined
  if (!order) return null

  const state = (order as Record<string, unknown>).state as string | undefined

  return (
    <>
      <PageHeader
        title={`Заказ ${order.order_id ?? orderId}`}
        subtitle={new Date(order.created_at).toLocaleString()}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => navigate('/orders')}>
              ← Назад
            </button>
            <button
              className="btn-danger"
              onClick={() => { if (confirm('Отменить заказ?')) cancelMutation.mutate() }}
              disabled={cancelMutation.isPending || order.canceled}
            >
              Отменить
            </button>
          </div>
        }
      />

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          {state && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{FIELDS.state.label}</p>
              <p className="mt-1 font-medium">{STATE_LABELS[state] ?? state}</p>
            </div>
          )}
          {order.delivery_name && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{FIELDS.delivery_name.label}</p>
              <p className="mt-1 font-medium">{order.delivery_name}</p>
            </div>
          )}
          {order.origin && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{FIELDS.origin.label}</p>
              <p className="mt-1 font-medium">{order.origin}</p>
            </div>
          )}
          {order.indoc_id && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{FIELDS.indoc_id.label}</p>
              <p className="mt-1 font-mono text-sm">{order.indoc_id}</p>
            </div>
          )}
          {order.canceled != null && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{FIELDS.canceled.label}</p>
              <p className="mt-1">{order.canceled ? 'Да' : 'Нет'}</p>
            </div>
          )}
        </div>
      </div>

      {order.goods && order.goods.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Товары</h2>
          <div className="card overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">{FIELDS.good_id.label}</th>
                  <th className="th text-right">{FIELDS.qnt.short}</th>
                  <th className="th text-right">{FIELDS.price.label}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.goods.map((g, i) => (
                  <tr key={i}>
                    <td className="td font-mono text-sm">{g.good_id}</td>
                    <td className="td text-right">{g.qnt}</td>
                    <td className="td text-right">{g.price != null ? `${g.price} ₽` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {order.events && order.events.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">История событий</h2>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">{FIELDS.event_type.label}</th>
                  <th className="th">{FIELDS.created_at.short}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.events.map((e, i) => (
                  <tr key={i}>
                    <td className="td">{e.event_type}</td>
                    <td className="td text-gray-500">{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(!order.goods || order.goods.length === 0) && (!order.events || order.events.length === 0) && (
        <EmptyState title="Нет детальных данных по заказу" />
      )}
    </>
  )
}
