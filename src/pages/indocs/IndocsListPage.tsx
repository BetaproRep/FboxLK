import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { indocsApi } from '@/api/indocs'
import type { IndocListItem } from '@/types/indoc'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import CreateIndocModal from './CreateIndocModal'

function defaultDateFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function IndocsListPage() {
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<IndocListItem[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['indocs', dateFrom, dateTo, pageToken],
    queryFn: () =>
      indocsApi.list({ from_date: dateFrom, to_date: dateTo, page_size: 50, page_token: pageToken }),
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
      <PageHeader
        title="Входящие документы"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Создать документ
          </button>
        }
      />

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
          <EmptyState title="Документы не найдены" description="Измените период или создайте новый документ" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Номер</th>
                <th className="th">Тип</th>
                <th className="th">Дата создания</th>
                <th className="th">Примечание</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allItems.map((item) => (
                <tr
                  key={item.indoc_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/indocs/${item.indoc_id}`)}
                >
                  <td className="td font-medium text-primary-600">{item.indoc_id}</td>
                  <td className="td text-gray-500">{item.indoc_type_descrip}</td>
                  <td className="td text-gray-500">{item.created_at}</td>
                  <td className="td text-gray-500 max-w-xs truncate">{item.indoc_txt ?? '—'}</td>
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

      <CreateIndocModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}
