import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

export async function getProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return data
}
