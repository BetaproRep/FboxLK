import { Outlet } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="Справка" subtitle={<span className="text-sm text-gray-500">Понятия и процессы фулфилмента</span>} />
      <Outlet />
    </div>
  )
}
