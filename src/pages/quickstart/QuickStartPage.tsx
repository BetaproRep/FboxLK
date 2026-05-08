import { Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'

export default function QuickStartPage() {
  return (
    <div>
      <PageHeader title="Быстрый старт" subtitle={<span className="text-sm text-gray-500">Знакомство с фулфилментом за 5 шагов</span>} />
      <Outlet />
    </div>
  )
}
