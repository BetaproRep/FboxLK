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
import GoodsStockPage from '@/pages/goods/GoodsStockPage'
import OrdersListPage from '@/pages/orders/OrdersListPage'
import OrderDetailPage from '@/pages/orders/OrderDetailPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
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
          <Route index element={<Navigate to="/indocs" replace />} />
          <Route path="indocs" element={<IndocsListPage />} />
          <Route path="indocs/:id" element={<IndocDetailPage />} />
          <Route path="outdocs" element={<OutdocsListPage />} />
          <Route path="outdocs/:id" element={<OutdocDetailPage />} />
          <Route path="goods" element={<GoodsListPage />} />
          <Route path="goods/stock" element={<GoodsStockPage />} />
          <Route path="goods/:id" element={<GoodDetailPage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
