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

  const username = profile?.username || 'Explorateur'

  return <header className="topbar">
    <Link className="brand" href="/"><img className="logo-img" src="/logo.png" alt=""/><span>EXPÉDITION</span></Link>

    <nav className="desktop-nav" aria-label="Navigation principale">
      {user ? <>
        <Link href="/">Accueil</Link>
        <Link href="/explore">Explorer</Link>
        <Link href="/notifications">Notifications</Link>
        <Link href="/support">Soutenir</Link>
        <Link className="nav-user" href={`/profile/${user.id}`} title={`Profil de ${username}`}>Profil</Link>
        {profile?.role === 'platform_admin' && <Link href="/admin">Admin</Link>}
        <form action={logoutAction}><button className="linkbtn" type="submit">Déconnexion</button></form>
      </> : <>
        <Link href="/explore">Explorer</Link>
        <Link href="/support">Soutenir</Link>
        <Link href="/login">Connexion</Link>
        <Link className="button small" href="/register">Créer un compte</Link>
      </>}
    </nav>

    <details className="mobile-menu">
      <summary aria-label="Ouvrir le menu" title="Menu">
        <span className="hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
      </summary>
      <div className="mobile-menu-panel">
        {user ? <>
          <div className="mobile-menu-account">
            <span className="mobile-menu-avatar">{username.slice(0,1).toUpperCase()}</span>
            <div><strong>@{username}</strong><small>Compte Expédition</small></div>
          </div>
          <Link className="mobile-menu-item" href="/"><span className="mobile-menu-icon">⌂</span><span>Accueil</span></Link>
          <Link className="mobile-menu-item" href="/explore"><span className="mobile-menu-icon">⌕</span><span>Explorer</span></Link>
          <Link className="mobile-menu-item" href="/notifications"><span className="mobile-menu-icon">●</span><span>Notifications</span></Link>
          <Link className="mobile-menu-item" href={`/profile/${user.id}`}><span className="mobile-menu-icon">◉</span><span>Profil</span></Link>
          <Link className="mobile-menu-item" href="/support"><span className="mobile-menu-icon">♡</span><span>Soutenir</span></Link>
          {profile?.role === 'platform_admin' && <Link className="mobile-menu-item" href="/admin"><span className="mobile-menu-icon">⚙</span><span>Admin</span></Link>}
          <div className="mobile-menu-separator"/>
          <form className="mobile-menu-form" action={logoutAction}>
            <button className="mobile-menu-item mobile-menu-logout" type="submit"><span className="mobile-menu-icon">↪</span><span>Se déconnecter</span></button>
          </form>
        </> : <>
          <Link className="mobile-menu-item" href="/explore"><span className="mobile-menu-icon">⌕</span><span>Explorer</span></Link>
          <Link className="mobile-menu-item" href="/support"><span className="mobile-menu-icon">♡</span><span>Soutenir</span></Link>
          <Link className="mobile-menu-item" href="/login"><span className="mobile-menu-icon">→</span><span>Connexion</span></Link>
          <Link className="mobile-menu-item mobile-menu-primary" href="/register"><span className="mobile-menu-icon">＋</span><span>Créer un compte</span></Link>
        </>}
      </div>
    </details>
  </header>
}
