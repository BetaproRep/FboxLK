import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/api/orders'
import type { OrderListItem } from '@/types/order'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { FIELDS } from '@/constants/fields'

const STATE_LABELS: Record<string, string> = {
  wait: 'Ожидание',
  canceled: 'Отменён',
  inwork: 'В работе',
  shipped: 'Отгружен',
}

const STATE_COLORS: Record<string, string> = {
  wait: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-gray-100 text-gray-500',
  inwork: 'bg-blue-100 text-blue-700',
  shipped: 'bg-green-100 text-green-700',
}

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function OrdersListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<OrderListItem[]>([])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['orders', dateFrom, dateTo, pageToken],
    queryFn: () =>
      ordersApi.list({ from_date: dateFrom, to_date: dateTo, page_size: 50, page_token: pageToken }),
  })

  useEffect(() => {
    if (!data) return
    const items = data.items ?? []
    setAllItems((prev) => (pageToken ? [...prev, ...items] : items))
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange() {
    setPageToken(undefined)
    setAllItems([])
  }

  return (
    <>
      <PageHeader title="Заказы" />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => { setDateFrom(v); handleFilterChange() }}
          onDateToChange={(v) => { setDateTo(v); handleFilterChange() }}
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading && !allItems.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : allItems.length === 0 ? (
          <EmptyState title="Заказы не найдены" description="Измените период фильтрации" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">{FIELDS.order_id.short}</th>
                <th className="th">{FIELDS.created_at.short}</th>
                <th className="th">{FIELDS.state.short}</th>
                <th className="th">{FIELDS.origin.short}</th>
                <th className="th">{FIELDS.delivery_id.short}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allItems.map((item) => (
                <tr
                  key={item.order_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/orders/${item.order_id}`)}
                >
                  <td className="td font-medium text-primary-600">{item.order_id}</td>
                  <td className="td text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="td">
                    <span className={`badge ${STATE_COLORS[item.state] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATE_LABELS[item.state] ?? item.state}
                    </span>
                  </td>
                  <td className="td text-gray-500">{item.origin ?? '—'}</td>
                  <td className="td text-gray-500">{item.delivery_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data?.page_next_token && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              className="btn-secondary"
              disabled={isFetching}
              onClick={() => setPageToken(data.page_next_token)}
            >
              {isFetching ? <Spinner className="w-4 h-4" /> : 'Загрузить ещё'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
