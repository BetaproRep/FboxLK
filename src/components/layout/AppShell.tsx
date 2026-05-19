import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAccountSettings } from '@/hooks/useAccountSettings'

export default function AppShell() {
  const { data } = useAccountSettings()
  const fulfillment = data?.fulfillment

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar logoUrl={fulfillment?.logo_url} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header contactInfo={fulfillment?.contact_info} />
        <main id="app-scroll-main" className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
