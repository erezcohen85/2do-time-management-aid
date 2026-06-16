import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cloud sync is opt-in: provide VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in
// a .env file to enable it. Until then, 2DO runs fully on the local store
// (see src/data/store.ts) so the app works immediately with no account.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isCloudEnabled = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url!, anonKey!)
  : null

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Cloud sync is not configured')
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signOut() {
  await supabase?.auth.signOut()
}
