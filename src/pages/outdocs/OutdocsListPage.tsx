import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { outdocsApi } from '@/api/outdocs'
import type { OutdocListItem } from '@/types/outdoc'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function OutdocsListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<OutdocListItem[]>([])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['outdocs', dateFrom, dateTo, pageToken],
    queryFn: () =>
      outdocsApi.list({ from_date: dateFrom, to_date: dateTo, page_size: 50, page_token: pageToken }),
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
      <PageHeader title="Исходящие документы" />

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
          <EmptyState title="Документы не найдены" description="Измените период фильтрации" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">ID</th>
                <th className="th">Тип</th>
                <th className="th">Дата</th>
                <th className="th">Создан</th>
                <th className="th">Блокировка</th>
                <th className="th">Примечание</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allItems.map((item) => (
                <tr
                  key={item.outdoc_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/outdocs/${item.outdoc_id}`)}
                >
                  <td className="td font-medium text-primary-600">{item.outdoc_id}</td>
                  <td className="td text-gray-500">{item.outdoc_type_descrip}</td>
                  <td className="td text-gray-500">{item.outdoc_date}</td>
                  <td className="td text-gray-500">{item.created_at}</td>
                  <td className="td">
                    {item.locked
                      ? <span className="badge bg-orange-100 text-orange-700">Заблокирован</span>
                      : <span className="badge bg-gray-100 text-gray-500">Нет</span>
                    }
                  </td>
                  <td className="td text-gray-500 max-w-xs truncate">{item.outdoc_txt ?? '—'}</td>
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
