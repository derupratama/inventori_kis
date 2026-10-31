import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigError } from '../../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(supabaseConfigError)

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined }
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      setError(sessionError?.message ?? null)
      setLoading(false)
    }).catch((sessionError) => {
      if (active) { setError(sessionError.message); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setError(null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) throw new Error(supabaseConfigError)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
  }, [])
  const signOut = useCallback(async () => {
    if (!supabase) throw new Error(supabaseConfigError)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
  }, [])

  const value = useMemo(() => ({ session, user: session?.user ?? null, loading, error, signIn, signOut }), [session, loading, error, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth harus digunakan di dalam AuthProvider.')
  return value
}
