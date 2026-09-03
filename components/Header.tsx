import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/actions/auth'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile: any = null
  if (user) {
    const { data } = await supabase.from('profiles').select('id,username,role,avatar_url').eq('id', user.id).maybeSingle()
    profile = data
  }
  return <header className="topbar">
    <Link className="brand" href="/"><img className="logo-img" src="/logo.png" alt=""/><span>EXPÉDITION</span></Link>
    <nav>
      {user ? <>
        <Link href="/">Accueil</Link>
        <Link href="/explore">Explorer</Link>
        <Link href="/notifications">Notifications</Link>
        <Link href="/support">Soutenir</Link>
        <Link className="nav-user" href={`/profile/${user.id}`}>{profile?.username || 'Profil'}</Link>
        {profile?.role === 'platform_admin' && <Link href="/admin">Admin</Link>}
        <form action={logoutAction}><button className="linkbtn" type="submit">Déconnexion</button></form>
      </> : <>
        <Link href="/login">Connexion</Link>
        <Link className="button small" href="/register">Créer un compte</Link>
      </>}
    </nav>
  </header>
}
