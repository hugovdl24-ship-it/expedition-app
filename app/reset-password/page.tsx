import { resetPasswordAction } from '@/app/actions/auth'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
export default async function Reset({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const sp=await searchParams;return <section className="card narrow"><div className="eyebrow">NOUVELLE CLÉ</div><h1>Choisir un nouveau mot de passe</h1><Flash message={sp.m} error={sp.e}/><form action={resetPasswordAction}><label>Nouveau mot de passe<input type="password" name="password" required minLength={8}/></label><label>Confirmer<input type="password" name="confirm" required minLength={8}/></label><SubmitButton>Changer mon mot de passe</SubmitButton></form></section>}
