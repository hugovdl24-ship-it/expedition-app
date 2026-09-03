import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata={title:'Créer un compte'}
export default async function Register({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const sp=await searchParams
 return <div className="auth-layout"><section className="card auth"><div className="eyebrow">PREMIER DÉPART</div><h1>Créer un compte</h1><Flash message={sp.m} error={sp.e}/><form action={registerAction}><label>Pseudo<input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+"/></label><label>Email<input type="email" name="email" required autoComplete="email"/></label><label>Mot de passe<input type="password" name="password" required minLength={8} autoComplete="new-password"/></label><p className="hint">8 caractères minimum. Un email de confirmation sera envoyé.</p><SubmitButton>Partir à l’aventure</SubmitButton></form><p>Déjà inscrit ? <Link href="/login">Connexion</Link></p></section><aside className="card auth-note"><h2>Pourquoi confirmer l’email ?</h2><p>Pour protéger ton compte, éviter les faux comptes et permettre la récupération du mot de passe.</p></aside></div>
}
