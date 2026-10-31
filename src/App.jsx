import { MotionConfig } from 'motion/react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/index.js'
import { AppDataProvider } from './components/app/AppDataProvider.jsx'
import { ProductsProvider } from './components/app/ProductsProvider.jsx'
import { RoutineCalendarProvider } from './components/app/RoutineCalendarProvider.jsx'
import { AuthProvider } from './components/auth/AuthProvider.jsx'
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx'
import { AppShell } from './components/app/AppShell.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import DailyRoutinePage from './pages/DailyRoutinePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProductDetailPage from './pages/ProductDetailPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import UsageSummaryPage from './pages/UsageSummaryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { RouteErrorBoundary } from './components/app/RouteErrorBoundary.jsx'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
        <AppDataProvider>
        <ProductsProvider>
        <RoutineCalendarProvider>
          <RouteErrorBoundary><Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="collection" element={<CollectionPage />} />
              <Route path="collection/:productId" element={<ProductDetailPage />} />
              <Route path="routine" element={<DailyRoutinePage />} />
              <Route path="usage-summary" element={<UsageSummaryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></RouteErrorBoundary>
        </RoutineCalendarProvider>
        </ProductsProvider>
        </AppDataProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
