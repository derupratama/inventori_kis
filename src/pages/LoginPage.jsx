import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Card, Input } from '../components/index.js'
import { useAuth } from '../components/auth/AuthProvider.jsx'

export default function LoginPage() {
  const { user, loading, signIn, error: configError } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  if (loading) return <main className="auth-screen" role="status">Memeriksa sesi…</main>
  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try { await signIn({ email: email.trim(), password }) }
    catch (signInError) { setError(signInError.message || 'Tidak dapat masuk. Periksa email dan kata sandi.') }
    finally { setSubmitting(false) }
  }

  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <span className="auth-card__eyebrow">My Skin Diary</span>
        <h1>Selamat datang kembali</h1>
        <p>Masuk untuk melanjutkan catatan perawatan kulitmu.</p>
        {configError && <p className="auth-message auth-message--error" role="alert">{configError}</p>}
        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
        <form onSubmit={submit} className="auth-form">
          <Input label="Email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Kata sandi" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <Button type="submit" loading={submitting} disabled={Boolean(configError)} className="auth-submit">Masuk</Button>
        </form>
      </Card>
    </main>
  )
}
