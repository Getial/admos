import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import OrdersPage from './features/orders/OrdersPage'
import OrderDetail from './features/orders/OrderDetail'
import OrderPrint from './features/orders/OrderPrint'
import ClientsPage from './features/clients/ClientsPage'
import EquipmentPage from './features/equipment/EquipmentPage'
import UsersPage from './features/users/UsersPage'
import DashboardPage from './features/dashboard/DashboardPage'

const queryClient = new QueryClient()

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function ChiefRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'JEFE_TALLER') return <Navigate to="/orders" replace />
  return <Layout>{children}</Layout>
}

function TecnicoRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'RECEPCIONISTA') return <Navigate to="/orders" replace />
  return <Layout>{children}</Layout>
}

function PrintRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster theme="dark" richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<PrivateRoute><ErrorBoundary><OrdersPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/orders/:id" element={<PrivateRoute><ErrorBoundary><OrderDetail /></ErrorBoundary></PrivateRoute>} />
            <Route path="/orders/:id/print" element={<PrintRoute><ErrorBoundary><OrderPrint /></ErrorBoundary></PrintRoute>} />
            <Route path="/clients" element={<PrivateRoute><ErrorBoundary><ClientsPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/equipment" element={<PrivateRoute><ErrorBoundary><EquipmentPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/users"      element={<ChiefRoute><ErrorBoundary><UsersPage /></ErrorBoundary></ChiefRoute>} />
            <Route path="/dashboard"  element={<TecnicoRoute><ErrorBoundary><DashboardPage /></ErrorBoundary></TecnicoRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
