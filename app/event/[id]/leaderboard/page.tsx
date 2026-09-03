import { EventHeader } from '@/components/EventHeader'
import { getEventContext } from '@/lib/event'
import { Avatar } from '@/components/Avatar'

export default async function Leaderboard({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const {supabase,event,memberCount,isAdmin}=await getEventContext(id)
  const started=new Date(event.start_at)<=new Date(); const ended=new Date(event.end_at)<=new Date()
  if(!started)return <><EventHeader event={event} memberCount={memberCount} isAdmin={isAdmin} active="leaderboard"/><section className="secretbox">🔒 Le classement ouvrira au départ. Tout le monde commencera à zéro.</section></>
  if(event.leaderboard_visibility==='hidden'&&!ended&&!isAdmin)return <><EventHeader event={event} memberCount={memberCount} isAdmin={isAdmin} active="leaderboard"/><section className="secretbox">🔒 Le classement est gardé secret jusqu’à la fin de l’expédition.</section></>
  const {data:board,error}=await supabase.rpc('event_leaderboard',{p_event_id:id})
  return <><EventHeader event={event} memberCount={memberCount} isAdmin={isAdmin} active="leaderboard"/><section className="card"><div className="eyebrow">LA COURSE</div><h1>🏆 Classement</h1>{error&&<div className="flash err">{error.message}</div>}<div className="leaderboard">{(board||[]).map((x:any,i:number)=><div className={`rank ${i<3?'podium':''}`} key={x.user_id}><span className="place">{['🥇','🥈','🥉'][i]||`${i+1}.`}</span><Avatar username={x.username} url={x.avatar_url}/><a href={`/profile/${x.user_id}`}>{x.username}</a><strong>{x.points} pts</strong></div>)}</div></section></>
}
