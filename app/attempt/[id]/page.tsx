import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { Avatar } from '@/components/Avatar'
import { Flash } from '@/components/Flash'
import { fmtDate } from '@/lib/format'
import { signedMediaMap } from '@/lib/media'
import { castVoteAction, addCommentAction, cancelAttemptAction, reportAttemptAction } from '@/app/actions/game'

export default async function AttemptPage({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<Record<string,string|undefined>>}){
  const {id}=await params;const sp=await searchParams;const user=await requireUser();const supabase=await createClient()
  let {data:attempt}=await supabase.from('attempts').select('*').eq('id',id).maybeSingle();if(!attempt)notFound()
  await supabase.rpc('refresh_event_state',{p_event_id:attempt.event_id});({data:attempt}=await supabase.from('attempts').select('*').eq('id',id).maybeSingle());if(!attempt)notFound()
  const [{data:event},{data:challenge},{data:author},{data:media},{data:comments},{data:votes},{count:memberCount}]=await Promise.all([
    supabase.from('events').select('*').eq('id',attempt.event_id).maybeSingle(),
    supabase.from('challenges').select('*').eq('id',attempt.challenge_id).maybeSingle(),
    supabase.from('profiles').select('id,username,avatar_url').eq('id',attempt.user_id).maybeSingle(),
    supabase.from('attempt_media').select('*').eq('attempt_id',id).order('position'),
    supabase.from('comments').select('*').eq('attempt_id',id).is('deleted_at',null).order('created_at'),
    supabase.from('votes').select('*').eq('attempt_id',id),
    supabase.from('event_members').select('*',{count:'exact',head:true}).eq('event_id',attempt.event_id).eq('status','active')
  ]) as any
  if(!event)notFound();const commentUserIds=[...new Set((comments||[]).map((c:any)=>c.user_id))];let commentProfiles:any[]=[];if(commentUserIds.length){const {data}=await supabase.from('profiles').select('id,username,avatar_url').in('id',commentUserIds);commentProfiles=data||[]}
  const cpmap=new Map(commentProfiles.map((p:any)=>[p.id,p]));const signed=await signedMediaMap(supabase,media||[])
  const required=Math.ceil(Math.max(0,(memberCount||1)-1)*Number(event.reject_threshold));const canVote=user.id!==attempt.user_id&&attempt.status==='voting';const mine=(votes||[]).find((v:any)=>v.user_id===user.id)
  const visibleVotes=event.vote_visibility==='visible';const approve=(votes||[]).filter((v:any)=>v.value==='approve').length;const reject=(votes||[]).filter((v:any)=>v.value==='reject').length
  return <section className="card"><Flash message={sp.m} error={sp.e}/><div className="attempt-head"><Avatar username={author?.username} url={author?.avatar_url} size="lg"/><div><strong>{author?.username||'Explorateur'}</strong><small className="muted">{fmtDate(attempt.submitted_at)}</small></div></div><h1 className="attempt-title">{challenge?.title||'Défi'}</h1>{attempt.content&&<p>{attempt.content}</p>}
    {(media||[]).length>0&&<div className="media-grid">{(media||[]).map((m:any)=><div className="media-shell" key={m.id}>{m.media_type==='video'?<video src={signed.get(m.id)} controls preload="metadata"/>:<a href={signed.get(m.id)} target="_blank" rel="noreferrer"><img src={signed.get(m.id)} alt="Preuve complète"/></a>}</div>)}</div>}
    <div className="statbar"><span><b>{challenge?.points||0}</b> points</span><span><b>{visibleVotes?approve:'—'}</b> validations</span><span><b>{visibleVotes?reject:'—'}</b> refus</span><span><b>{required}</b> refus requis</span><span>{attempt.status==='approved'?'✅ VALIDÉ':attempt.status==='rejected'?'❌ À RETENTER':attempt.status==='cancelled'?'Annulé':attempt.status==='submitted'?'🔒 Secret jusqu’à la fin':'⏳ Vote ouvert'}</span></div>
    {attempt.status==='voting'&&<p className="hint">Fin du vote : {fmtDate(attempt.vote_ends_at)}. {event.vote_visibility==='hidden'?'La répartition des votes est cachée.':''}</p>}
    {canVote&&<form className="vote-row" action={castVoteAction.bind(null,id)}><button className={`vote-btn ${mine?.value==='approve'?'selected':''}`} name="value" value="approve">👍 Valider</button><button className={`vote-btn reject ${mine?.value==='reject'?'selected':''}`} name="value" value="reject">👎 Refuser</button></form>}
    {attempt.user_id===user.id&&attempt.status==='voting'&&<form action={cancelAttemptAction.bind(null,id)}><button className="button danger small" type="submit">Annuler ma tentative</button></form>}
    <details className="report"><summary>🚩 Signaler cette tentative</summary><form action={reportAttemptAction.bind(null,id)}><label>Motif<select name="reason"><option value="dangerous">Contenu dangereux</option><option value="harassment">Harcèlement</option><option value="illegal">Contenu illégal</option><option value="spam">Spam</option><option value="cheating">Triche</option><option value="other">Autre</option></select></label><label>Détails<textarea name="details" rows={2}/></label><button className="button ghost small">Envoyer le signalement</button></form></details><hr/><h2>Commentaires</h2><form className="comment-form" action={addCommentAction.bind(null,id)}><input name="content" maxLength={1000} placeholder="Écrire un commentaire…" required/><button className="button small">Envoyer</button></form><div className="comment-list">{(comments||[]).map((c:any)=>{const p:any=cpmap.get(c.user_id);return <div className="comment-item" key={c.id}><Avatar username={p?.username} url={p?.avatar_url} size="sm"/><div><strong>{p?.username||'Membre'}</strong><p>{c.content}</p><small className="muted">{fmtDate(c.created_at)}</small></div></div>})}</div>
  </section>
}
