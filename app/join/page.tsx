import { requireUser } from '@/lib/auth'
import { joinEventAction } from '@/app/actions/game'
import { Flash } from '@/components/Flash'
import { SubmitButton } from '@/components/SubmitButton'
export default async function Join({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){await requireUser();const sp=await searchParams;return <section className="card narrow"><div className="eyebrow">INVITATION</div><h1>Rejoindre une expédition</h1><Flash message={sp.m} error={sp.e}/><form action={joinEventAction}><label>Code d’invitation<input name="invite_code" required placeholder="AB12CD34" autoCapitalize="characters"/></label><SubmitButton>Rejoindre le camp</SubmitButton></form></section>}
