import { Routes, Route, Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import AssetsPage from '@/pages/AssetsPage'
import OrdersPage from '@/pages/OrdersPage'
import DepartmentsPage from '@/pages/DepartmentsPage'
import LoginPage from '@/pages/LoginPage'
import AdminPage from '@/pages/AdminPage'
import { StoreProvider, useStore, PERMS } from '@/lib/db'
import { LanguageProvider } from '@/lib/i18n'

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { currentUser, ready } = useStore()
  if (!ready) return null
  if (!currentUser) return <Navigate to="/login" replace />
  if (admin) {
    const base = PERMS.canManageUsers.includes(currentUser.role)
    const o = currentUser.permOverrides?.canManageUsers
    if (!(o === undefined ? base : !!o)) return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <LanguageProvider>
      <StoreProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/pm" element={<OrdersPage kind="pm" />} />
            <Route path="/cm" element={<OrdersPage kind="cm" />} />
            <Route path="/depts" element={<DepartmentsPage />} />
            <Route
              path="/admin"
              element={
                <RequireAuth admin>
                  <AdminPage />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
        <Toaster position="top-left" richColors />
      </StoreProvider>
    </LanguageProvider>
  )
}
