'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function target(path:string, type:'m'|'e', message:string) {
  return `${path}?${type}=${encodeURIComponent(message)}`
}

export async function registerAction(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const username = String(formData.get('username') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) redirect(target('/register','e','Pseudo invalide.'))
  if (password.length < 8) redirect(target('/register','e','Le mot de passe doit contenir au moins 8 caractères.'))
  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: `${origin}/auth/callback?next=/` }
  })
  if (error) redirect(target('/register','e', error.message))
  redirect(target('/check-email','m','Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.'))
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  const identifier = String(formData.get('identifier') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')

  let email = identifier

  if (!identifier.includes('@')) {
    if (identifier.length < 3 || !/^[a-z0-9._-]+$/.test(identifier)) {
      redirect(target('/login','e','Identifiant ou mot de passe incorrect, ou email non confirmé.'))
    }

    let admin
    try {
      admin = createAdminClient()
    } catch {
      redirect(target('/login','e','Connexion par pseudo temporairement indisponible. Utilise ton adresse email.'))
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('username', identifier)
      .maybeSingle()

    if (profileError || !profile) {
      redirect(target('/login','e','Identifiant ou mot de passe incorrect, ou email non confirmé.'))
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id)
    email = userData.user?.email || ''

    if (userError || !email) {
      redirect(target('/login','e','Identifiant ou mot de passe incorrect, ou email non confirmé.'))
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(target('/login','e','Identifiant ou mot de passe incorrect, ou email non confirmé.'))
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logoutAction() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  if (error) redirect(target('/','e','La déconnexion a échoué. Réessaie dans un instant.'))
  redirect(target('/login','m','Tu es bien déconnecté.'))
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` })
  redirect(target('/forgot-password','m','Si un compte correspond à cette adresse, un email de récupération a été envoyé.'))
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')
  if (password.length < 8) redirect(target('/reset-password','e','Le mot de passe doit contenir au moins 8 caractères.'))
  if (password !== confirm) redirect(target('/reset-password','e','Les deux mots de passe ne correspondent pas.'))
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(target('/reset-password','e',error.message))
  redirect(target('/','m','Mot de passe modifié.'))
}
