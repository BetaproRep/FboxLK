import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { goodsApi } from '@/api/goods'
import type { GoodStock } from '@/types/good'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { FIELDS } from '@/constants/fields'

type Mode = 'current' | 'date' | 'expiry'

export default function GoodsStockPage() {
  const [mode, setMode] = useState<Mode>('current')
  const [stockDate, setStockDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: currentData, isLoading: loadingCurrent } = useQuery({
    queryKey: ['goods-stock'],
    queryFn: () => goodsApi.getStock(),
    enabled: mode === 'current',
  })

  const { data: dateData, isLoading: loadingDate } = useQuery({
    queryKey: ['goods-stock-date', stockDate],
    queryFn: () => goodsApi.getStockByDate(stockDate),
    enabled: mode === 'date',
  })

  const { data: expiryData, isLoading: loadingExpiry } = useQuery({
    queryKey: ['goods-stock-expiry'],
    queryFn: () => goodsApi.getStockExpiry(),
    enabled: mode === 'expiry',
  })

  const isLoading = loadingCurrent || loadingDate || loadingExpiry

  const items: GoodStock[] = (() => {
    if (mode === 'current') return currentData?.items ?? []
    if (mode === 'date') return (dateData as { items?: GoodStock[] } | undefined)?.items ?? []
    return (expiryData as { items?: GoodStock[] } | undefined)?.items ?? []
  })()

  return (
    <>
      <PageHeader title="Остатки товаров" />

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(['current', 'date', 'expiry'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === m ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {{ current: 'Текущие', date: 'На дату', expiry: 'Со сроком годности' }[m]}
            </button>
          ))}
        </div>

        {mode === 'date' && (
          <input
            type="date"
            className="input w-40"
            value={stockDate}
            onChange={(e) => setStockDate(e.target.value)}
          />
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Нет данных об остатках" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">{FIELDS.good_id.short}</th>
                <th className="th">{FIELDS.qual_type.short}</th>
                <th className="th text-right">{FIELDS.stock.short}</th>
                <th className="th text-right">{FIELDS.quarantine.short}</th>
                <th className="th text-right">{FIELDS.long_storage.short}</th>
                <th className="th text-right">{FIELDS.orders_inwork.short}</th>
                <th className="th text-right">{FIELDS.orders_wait.short}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((g, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-mono text-sm">{g.good_id}</td>
                  <td className="td text-gray-500">{g.qual_type}</td>
                  <td className="td text-right font-medium text-green-700">{g.stock}</td>
                  <td className="td text-right text-orange-600">{g.quarantine}</td>
                  <td className="td text-right text-gray-500">{g.long_storage}</td>
                  <td className="td text-right text-gray-500">{g.orders_inwork}</td>
                  <td className="td text-right text-gray-500">{g.orders_wait}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
