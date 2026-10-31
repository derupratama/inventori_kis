import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="auth-screen" role="status">Memeriksa sesi…</main>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
