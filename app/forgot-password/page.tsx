import { forgotPasswordAction } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
export default async function Forgot({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const sp=await searchParams;return <section className="card narrow"><div className="eyebrow">RÉCUPÉRATION</div><h1>Mot de passe oublié</h1><Flash message={sp.m} error={sp.e}/><p>Entre ton adresse email. Si un compte existe, tu recevras un lien sécurisé.</p><form action={forgotPasswordAction}><label>Email<input type="email" name="email" required/></label><SubmitButton>Envoyer le lien</SubmitButton></form></section>}
