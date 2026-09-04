import Link from 'next/link'
import { EventHeader } from '@/components/EventHeader'
import { Flash } from '@/components/Flash'
import { AdSlot } from '@/components/AdSlot'
import { getEventContext } from '@/lib/event'
import { signedMediaMap } from '@/lib/media'
import { fmtDate } from '@/lib/format'
import { Avatar } from '@/components/Avatar'

export default async function EventFeed({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<Record<string,string|undefined>>}){
  const {id}=await params; const sp=await searchParams
  const {user,supabase,event,memberCount,isAdmin}=await getEventContext(id)
  const started=new Date(event.start_at)<=new Date()
  if(!started) return <><Flash message={sp.m} error={sp.e}/><EventHeader event={event} memberCount={memberCount} isAdmin={isAdmin} active="feed"/><section className="prelaunch"><div className="eyebrow">AVANT LE DÉPART</div><h2>Le camp est ouvert.</h2><p>Les participants peuvent rejoindre l’expédition, mais <strong>les défis restent secrets jusqu’au {fmtDate(event.start_at)}</strong>. Aucune tentative ni aucun point n’est possible avant le départ.</p>{isAdmin&&<p><Link className="button" href={`/event/${id}/admin`}>Préparer les défis</Link></p>}</section></>

  const {data:attempts}=await supabase.from('attempts').select('*').eq('event_id',id).order('submitted_at',{ascending:false}).limit(50)
  const list=attempts||[]
  const userIds=[...new Set(list.map((a:any)=>a.user_id))]
  const challengeIds=[...new Set(list.map((a:any)=>a.challenge_id))]
  const attemptIds=list.map((a:any)=>a.id)
  const [{data:profiles},{data:challenges},{data:media},{data:activity}]=await Promise.all([
    userIds.length?supabase.from('profiles').select('id,username,avatar_url').in('id',userIds):Promise.resolve({data:[]}),
    challengeIds.length?supabase.from('challenges').select('id,title,points').in('id',challengeIds):Promise.resolve({data:[]}),
    attemptIds.length?supabase.from('attempt_media').select('*').in('attempt_id',attemptIds).order('position'):Promise.resolve({data:[]}),
    supabase.from('activity_feed').select('*').eq('event_id',id).order('created_at',{ascending:false}).limit(15)
  ]) as any
  const pmap=new Map((profiles||[]).map((p:any)=>[p.id,p])); const cmap=new Map((challenges||[]).map((c:any)=>[c.id,c]))
  const signed=await signedMediaMap(supabase,media||[])
  return <><Flash message={sp.m} error={sp.e}/><EventHeader event={event} memberCount={memberCount} isAdmin={isAdmin} active="feed"/><div className="twocol"><section><h2>Fil de l’expédition</h2><div className="mobile-only mobile-feed-ad"><AdSlot kind="rectangle"/></div>{list.map((a:any)=>{const p:any=pmap.get(a.user_id);const c:any=cmap.get(a.challenge_id);const ms=(media||[]).filter((m:any)=>m.attempt_id===a.id);return <article className="card attemptcard" key={a.id}><div className="attempt-head"><Avatar username={p?.username} url={p?.avatar_url}/><div><strong>{p?.username||'Explorateur'}</strong><small className="muted">{fmtDate(a.submitted_at)}</small></div></div><Link href={`/attempt/${a.id}`}><h3 className="attempt-title">{c?.title||'Défi'}</h3></Link>{a.content&&<p>{a.content}</p>}{ms.length>0&&<div className="media-grid">{ms.slice(0,4).map((m:any)=><div className="media-shell" key={m.id}>{m.media_type==='video'?<video src={signed.get(m.id)} controls preload="metadata"/>:<img src={signed.get(m.id)} alt="Preuve"/>}</div>)}</div>}<div className="statbar"><span><b>{c?.points||0}</b> points</span><span>{a.status==='approved'?'✅ Validé':a.status==='rejected'?'❌ À retenter':a.status==='submitted'?'🔒 Secret':'⏳ En vote'}</span></div><Link className="button ghost small" href={`/attempt/${a.id}`}>Voir et voter</Link></article>})}{!list.length&&<div className="card empty-state"><h2>Le calme avant la tempête.</h2><p>Aucune tentative pour l’instant.</p></div>}</section><aside><AdSlot kind="rectangle"/><div className="card"><h2>Journal</h2><div className="timeline">{(activity||[]).map((a:any)=><div className="timelineitem" key={a.id}><span>•</span><div><strong>{activityText(a)}</strong><small>{fmtDate(a.created_at)}</small></div></div>)}{!(activity||[]).length&&<p>Rien à signaler.</p>}</div></div></aside></div></>
}

function activityText(a:any){const m=a.metadata||{};switch(a.type){case'event_created':return'Expédition créée.';case'member_joined':return'Un nouvel explorateur a rejoint le camp.';case'challenge_added':return`Nouveau défi : ${m.title||'Défi'}.`;case'attempt_published':return`Nouvelle tentative : ${m.title||'défi'}.`;case'attempt_approved':return`Défi validé : ${m.title||'défi'} (+${m.points||0} pts).`;case'attempt_rejected':return`Tentative à retenter : ${m.title||'défi'}.`;case'member_banned':return'Un membre a été exclu.';default:return'Le camp a été mis à jour.'}}
