import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { markNotificationsReadAction } from '@/app/actions/game'
import { fmtDate } from '@/lib/format'
export default async function Notifications(){const user=await requireUser();const supabase=await createClient();const {data:items}=await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);return <><section className="pagehead"><div><div className="eyebrow">MESSAGES DU CAMP</div><h1>Notifications</h1></div><form action={markNotificationsReadAction}><button className="button ghost small">Tout marquer comme lu</button></form></section><section className="card notiflist">{(items||[]).map((n:any)=><Link href={n.link||'#'} key={n.id} style={{fontWeight:n.read_at?500:850}}><span>{n.text}</span><small>{fmtDate(n.created_at)}</small></Link>)}{!(items||[]).length&&<p>Aucune notification.</p>}</section></>}
