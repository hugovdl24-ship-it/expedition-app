import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { fmtDate } from '@/lib/format'

export const metadata={title:'Explorer'}
export default async function Explore(){
  const user=await requireUser(); const supabase=await createClient()
  const [{data:events},{data:memberships}] = await Promise.all([
    supabase.from('events').select('*').eq('visibility','public').not('status','in','("cancelled","platform_suspended")').order('created_at',{ascending:false}),
    supabase.from('event_members').select('event_id').eq('user_id',user.id).eq('status','active')
  ])
  const joined=new Set((memberships||[]).map((m:any)=>m.event_id))
  return <><section className="pagehead"><div><div className="eyebrow">EXPLORER</div><h1>Expéditions publiques</h1><p>Rejoins une aventure ouverte. Le fil et les preuves restent réservés aux membres.</p></div><Link className="button ghost" href="/join">J’ai un code</Link></section><div className="grid">{(events||[]).map((e:any)=><article className={`card eventcard ${joined.has(e.id)?'event-card-joined':''}`} key={e.id}><div className="eyebrow">{new Date(e.start_at)>new Date()?'CAMP OUVERT':'EN COURS'}</div><h2>{e.name}</h2><p>{e.description}</p><div className="event-meta"><span>🚩 {fmtDate(e.start_at)}</span><span>🏁 {fmtDate(e.end_at)}</span>{e.max_members&&<span>👥 max {e.max_members}</span>}</div><div className="event-card-actions"><span className="badge">{joined.has(e.id)?'Déjà rejoint':'Public'}</span><Link className="button small" href={joined.has(e.id)?`/event/${e.id}`:`/event/${e.id}/join`}>{joined.has(e.id)?'Ouvrir':'Rejoindre'}</Link></div></article>)}{!(events||[]).length&&<div className="card empty-state"><h2>Rien pour le moment.</h2><p>Les prochaines expéditions publiques apparaîtront ici.</p></div>}</div></>
}
