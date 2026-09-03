import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { joinEventAction } from '@/app/actions/game'
import { SubmitButton } from '@/components/SubmitButton'
import { notFound } from 'next/navigation'
import { fmtDate } from '@/lib/format'
export default async function PublicJoin({params}:{params:Promise<{id:string}>}){await requireUser();const {id}=await params;const supabase=await createClient();const {data:e}=await supabase.from('events').select('*').eq('id',id).maybeSingle();if(!e)notFound();return <section className="card narrow"><div className="eyebrow">EXPÉDITION PUBLIQUE</div><h1>{e.name}</h1><p>{e.description}</p><div className="event-meta"><span>🚩 {fmtDate(e.start_at)}</span><span>🏁 {fmtDate(e.end_at)}</span></div><form action={joinEventAction}><input type="hidden" name="event_id" value={e.id}/><SubmitButton>Rejoindre gratuitement</SubmitButton></form></section>}
