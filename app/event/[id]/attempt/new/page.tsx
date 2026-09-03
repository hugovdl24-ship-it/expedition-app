import { redirect } from 'next/navigation'
import { EventHeader } from '@/components/EventHeader'
import { AttemptUploader } from '@/components/AttemptUploader'
import { getEventContext } from '@/lib/event'

export default async function NewAttempt({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<Record<string,string|undefined>>}){
  const {id}=await params; const sp=await searchParams
  const {user,supabase,event,memberCount,isAdmin}=await getEventContext(id)
  const now=new Date(); if(now<new Date(event.start_at))redirect(`/event/${id}?e=${encodeURIComponent('Les défis ne démarrent qu’à la date de départ.')}`);if(now>=new Date(event.end_at))redirect(`/event/${id}?e=${encodeURIComponent('L’expédition est terminée.')}`)
  const {data:challenges}=await supabase.from('challenges').select('*').eq('event_id',id).eq('platform_removed',false).order('created_at')
  const {data:mine}=await supabase.from('attempts').select('challenge_id,status').eq('event_id',id).eq('user_id',user.id).in('status',['submitted','voting','approved'])
  const blocked=new Set((mine||[]).map((a:any)=>a.challenge_id)); const available=(challenges||[]).filter((c:any)=>!blocked.has(c.id))
  return <><EventHeader event={event} memberCount={memberCount} isAdmin={isAdmin} active="challenges"/><section className="card narrow"><div className="eyebrow">MONTRE-NOUS</div><h1>Publier ma tentative</h1>{available.length?<AttemptUploader eventId={id} userId={user.id} challenges={available} initialChallenge={sp.challenge}/>:<div className="empty-state"><h2>Rien à publier</h2><p>Tu as déjà une tentative active ou validée sur tous les défis disponibles.</p></div>}</section></>
}
