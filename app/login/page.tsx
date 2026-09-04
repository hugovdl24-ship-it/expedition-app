import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title:'Connexion' }
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const sp=await searchParams
  return <div className="auth-layout"><section className="card auth"><div className="eyebrow">RETOUR AU CAMP</div><h1>Connexion</h1><Flash message={sp.m} error={sp.e}/><form action={loginAction}><label>Email ou pseudo<input type="text" name="identifier" required autoComplete="username" placeholder="ton@email.com ou tonpseudo"/></label><label>Mot de passe<input type="password" name="password" required autoComplete="current-password"/></label><SubmitButton>Entrer</SubmitButton></form><p><Link href="/forgot-password">Mot de passe oublié ?</Link></p><p>Pas encore de compte ? <Link href="/register">Créer un compte</Link></p></section><aside className="card auth-note"><img className="landing-logo" src="/logo.png" alt=""/><h2>Une année. Une liste. Un gagnant.</h2><p>Connecte-toi avec ton adresse email ou ton pseudo pour retrouver tes expéditions et tes preuves.</p></aside></div>
}
