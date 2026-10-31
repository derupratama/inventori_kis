import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigError = !url || !key
  ? 'Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local.'
  : null

// A publishable/anon key is expected in a browser. Never put a service_role key here.
export const supabase = supabaseConfigError ? null : createClient(url, key)
