import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { goodsApi } from '@/api/goods'
import type { GoodListItem } from '@/types/good'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

export default function GoodsListPage() {
  const navigate = useNavigate()
  const [pageToken, setPageToken] = useState<string | undefined>()
  const [allItems, setAllItems] = useState<GoodListItem[]>([])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['goods', pageToken],
    queryFn: () => goodsApi.list({ page_size: 50, page_token: pageToken }),
  })

  useEffect(() => {
    if (!data) return
    const items = data.items ?? []
    setAllItems((prev) => (pageToken ? [...prev, ...items] : items))
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Товары" />

      <div className="card overflow-hidden">
        {isLoading && !allItems.length ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : allItems.length === 0 ? (
          <EmptyState title="Товары не найдены" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">ID товара</th>
                <th className="th">Наименование</th>
                <th className="th">Тип</th>
                <th className="th">Группа</th>
                <th className="th">Вес, г</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allItems.map((item) => (
                <tr
                  key={item.good_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/goods/${item.good_id}`)}
                >
                  <td className="td font-mono text-sm text-primary-600">{item.good_id}</td>
                  <td className="td font-medium">{item.good_name}</td>
                  <td className="td text-gray-500">{item.good_type}</td>
                  <td className="td text-gray-500">{item.gtr_name ?? '—'}</td>
                  <td className="td text-gray-500">{item.weight ?? '—'}</td>
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
