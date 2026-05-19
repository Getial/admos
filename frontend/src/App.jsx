import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import Layout from './components/Layout'
import OrdersPage from './features/orders/OrdersPage'
import OrderDetail from './features/orders/OrderDetail'
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
            <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
            <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
            <Route path="/equipment" element={<PrivateRoute><EquipmentPage /></PrivateRoute>} />
            <Route path="/users"      element={<ChiefRoute><UsersPage /></ChiefRoute>} />
            <Route path="/dashboard"  element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
