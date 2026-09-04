import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { joinEventAction } from '@/app/actions/game'
import { SubmitButton } from '@/components/SubmitButton'
import { notFound } from 'next/navigation'
import { fmtDate } from '@/lib/format'

export default async function PublicJoin({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  const publicClient=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)?createAdminClient():supabase
  const {data:e}=await publicClient.from('events').select('id,name,description,start_at,end_at,max_members,status,visibility').eq('id',id).eq('visibility','public').maybeSingle()
  if(!e)notFound()

  return <section className="card narrow"><div className="eyebrow">EXPÉDITION PUBLIQUE</div><h1>{e.name}</h1><p>{e.description}</p><div className="event-meta"><span>🚩 {fmtDate(e.start_at)}</span><span>🏁 {fmtDate(e.end_at)}</span>{e.max_members&&<span>👥 max {e.max_members}</span>}</div>{user?<form action={joinEventAction}><input type="hidden" name="event_id" value={e.id}/><SubmitButton>Rejoindre gratuitement</SubmitButton></form>:<><div className="prelaunch"><strong>Tu peux découvrir cette expédition sans compte.</strong><p>Pour rejoindre le groupe, publier des preuves, voter ou commenter, connecte-toi ou crée ton compte.</p></div><div className="actions"><Link className="button" href="/login">Se connecter</Link><Link className="button ghost" href="/register">Créer un compte</Link></div></>}</section>
}
