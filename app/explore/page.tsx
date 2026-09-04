import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtDate } from '@/lib/format'

export const metadata={title:'Explorer'}

export default async function Explore(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  const publicClient=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)?createAdminClient():supabase

  const {data:events}=await publicClient
    .from('events')
    .select('id,name,description,start_at,end_at,max_members,status,visibility')
    .eq('visibility','public')
    .not('status','in','("cancelled","platform_suspended")')
    .order('created_at',{ascending:false})

  let memberships:any[]=[]
  if(user){
    const {data}=await supabase.from('event_members').select('event_id').eq('user_id',user.id).eq('status','active')
    memberships=data||[]
  }
  const joined=new Set(memberships.map((m:any)=>m.event_id))

  return <>
    <section className="pagehead"><div><div className="eyebrow">EXPLORER LIBREMENT</div><h1>Expéditions publiques</h1><p>Découvre les aventures ouvertes sans créer de compte. Les preuves, commentaires et contenus réservés aux membres restent protégés.</p></div>{user?<Link className="button ghost" href="/join">J’ai un code</Link>:<Link className="button ghost" href="/register">Créer un compte</Link>}</section>

    <div className="grid">{(events||[]).map((e:any)=><article className={`card eventcard public-card ${joined.has(e.id)?'event-card-joined':''}`} key={e.id}><div className="eyebrow">{new Date(e.start_at)>new Date()?'CAMP OUVERT':'EN COURS'}</div><h2>{e.name}</h2><p>{e.description}</p><div className="event-meta"><span>🚩 {fmtDate(e.start_at)}</span><span>🏁 {fmtDate(e.end_at)}</span>{e.max_members&&<span>👥 max {e.max_members}</span>}</div><div className="event-card-actions"><span className="badge">{joined.has(e.id)?'Déjà rejoint':'Public'}</span><Link className="button small" href={joined.has(e.id)?`/event/${e.id}`:`/event/${e.id}/join`}>{joined.has(e.id)?'Ouvrir':'Voir / rejoindre'}</Link></div></article>)}{!(events||[]).length&&<div className="card empty-state"><div className="bigicon">🧭</div><h2>Les prochains départs arrivent.</h2><p>Aucune expédition publique n’est ouverte pour le moment. Tu peux quand même découvrir le fonctionnement d’Expédition et revenir plus tard.</p></div>}</div>

    <section className="section-block"><div className="section-title"><div className="eyebrow">CE QUI RESTE PUBLIC</div><h2>Découvrir sans exposer la vie du groupe.</h2><p>Expédition sépare la découverte publique des contenus personnels des participants.</p></div><div className="featuregrid"><article className="card"><h3>🗺️ Les aventures ouvertes</h3><p>Le nom, la description et les dates des expéditions publiques peuvent être consultés librement.</p></article><article className="card"><h3>🔒 Les preuves restent protégées</h3><p>Les photos, vidéos, commentaires et fils d’activité réservés aux membres ne sont pas rendus publics.</p></article><article className="card"><h3>🏕️ Rejoins quand tu veux</h3><p>Quand une aventure te plaît, connecte-toi ou crée un compte pour demander à rejoindre le camp.</p></article></div></section>
  </>
}
