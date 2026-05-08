import { Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Дашборд" />
      <Outlet />
    </div>
  )
}
