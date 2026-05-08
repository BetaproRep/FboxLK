import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import IndocsListPage from '@/pages/indocs/IndocsListPage'
import IndocDetailPage from '@/pages/indocs/IndocDetailPage'
import OutdocsListPage from '@/pages/outdocs/OutdocsListPage'
import OutdocDetailPage from '@/pages/outdocs/OutdocDetailPage'
import GoodsListPage from '@/pages/goods/GoodsListPage'
import GoodDetailPage from '@/pages/goods/GoodDetailPage'
import OrdersListPage from '@/pages/orders/OrdersListPage'
import OrderDetailPage from '@/pages/orders/OrderDetailPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import V1Operational from '@/pages/dashboard/variants/V1Operational'
import QuickStartPage from '@/pages/quickstart/QuickStartPage'
import V3CardsGrid from '@/pages/quickstart/variants/V3CardsGrid'
import HelpPage from '@/pages/help/HelpPage'
import V2Tabs from '@/pages/help/variants/V2Tabs'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/accounts" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />}>
            <Route index element={<V1Operational />} />
            <Route path="v1" element={<V1Operational />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="quick-start" element={<QuickStartPage />}>
            <Route index element={<V3CardsGrid />} />
            <Route path="v3" element={<V3CardsGrid />} />
            <Route path="*" element={<Navigate to="/quick-start" replace />} />
          </Route>

          <Route path="help" element={<HelpPage />}>
            <Route index element={<V2Tabs />} />
            <Route path="v2" element={<V2Tabs />} />
            <Route path="*" element={<Navigate to="/help" replace />} />
          </Route>

          <Route path="indocs" element={<IndocsListPage />} />
          <Route path="indocs/:id" element={<IndocDetailPage />} />
          <Route path="outdocs" element={<OutdocsListPage />} />
          <Route path="outdocs/:id" element={<OutdocDetailPage />} />
          <Route path="goods" element={<GoodsListPage />} />
          <Route path="goods/:id" element={<GoodDetailPage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
