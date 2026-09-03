import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export async function getEventContext(eventId:string) {
  const user = await requireUser()
  const supabase = await createClient()
  await supabase.rpc('refresh_event_state', { p_event_id:eventId })
  const { data:event } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  if (!event) notFound()
  const { data:membership } = await supabase.from('event_members').select('*').eq('event_id',eventId).eq('user_id',user.id).eq('status','active').maybeSingle()
  if (!membership) redirect(`/event/${eventId}/join`)
  const { count:memberCount } = await supabase.from('event_members').select('*',{count:'exact',head:true}).eq('event_id',eventId).eq('status','active')
  const isAdmin = membership.role === 'admin' || event.owner_id === user.id
  return { user, supabase, event, membership, memberCount:memberCount||0, isAdmin }
}
