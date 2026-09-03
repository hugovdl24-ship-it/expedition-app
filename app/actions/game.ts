'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

function q(path:string, key:'m'|'e', msg:string){ return `${path}${path.includes('?')?'&':'?'}${key}=${encodeURIComponent(msg)}` }

export async function createEventAction(formData: FormData) {
  await requireUser()
  const supabase = await createClient()
  const start = String(formData.get('start_at') || '')
  const end = String(formData.get('end_at') || '')
  const maxRaw = String(formData.get('max_members') || '').trim()
  const { data, error } = await supabase.rpc('create_event', {
    p_name: String(formData.get('name') || ''),
    p_description: String(formData.get('description') || ''),
    p_visibility: String(formData.get('visibility') || 'private'),
    p_max_members: maxRaw ? Number(maxRaw) : null,
    p_start_at: new Date(start).toISOString(),
    p_end_at: new Date(end).toISOString(),
    p_reward_text: String(formData.get('reward_text') || ''),
    p_points_mode: String(formData.get('points_mode') || 'uniform'),
    p_default_points: Number(formData.get('default_points') || 1),
    p_vote_duration_hours: Number(formData.get('vote_duration_hours') || 168),
    p_reject_threshold: Number(formData.get('reject_threshold') || 50) / 100,
    p_vote_visibility: String(formData.get('vote_visibility') || 'hidden'),
    p_leaderboard_visibility: String(formData.get('leaderboard_visibility') || 'visible'),
    p_secret_submissions: formData.get('secret_submissions') === 'on'
  })
  if (error || !data) redirect(q('/event/new','e',error?.message || 'Impossible de créer l’événement.'))
  redirect(`/event/${data}?m=${encodeURIComponent('Expédition créée. Le camp est ouvert !')}`)
}

export async function joinEventAction(formData: FormData) {
  await requireUser()
  const supabase = await createClient()
  const eventId = String(formData.get('event_id') || '') || null
  const code = String(formData.get('invite_code') || '').trim() || null
  const { data, error } = await supabase.rpc('join_event', { p_event_id: eventId, p_invite_code: code })
  if (error || !data) redirect(q('/join','e', error?.message || 'Impossible de rejoindre cet événement.'))
  redirect(`/event/${data}?m=${encodeURIComponent('Bienvenue dans l’expédition !')}`)
}

export async function addChallengeAction(eventId:string, formData:FormData) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_challenge', {
    p_event_id: eventId,
    p_title: String(formData.get('title') || ''),
    p_description: String(formData.get('description') || ''),
    p_points: Number(formData.get('points') || 1),
    p_challenge_type: String(formData.get('challenge_type') || 'classic')
  })
  if (error) redirect(q(`/event/${eventId}/admin`,'e',error.message))
  revalidatePath(`/event/${eventId}`)
  revalidatePath(`/event/${eventId}/challenges`)
  redirect(q(`/event/${eventId}/admin`,'m','Nouveau défi ajouté.'))
}

export async function saveNoteAction(challengeId:string, eventId:string, formData:FormData) {
  const user = await requireUser()
  const supabase = await createClient()
  const payload = {
    challenge_id: challengeId,
    user_id: user.id,
    note: String(formData.get('note') || ''),
    planned_date: String(formData.get('planned_date') || '') || null,
    priority: String(formData.get('priority') || 'normal'),
    favorite: formData.get('favorite') === 'on'
  }
  await supabase.from('challenge_notes').upsert(payload, { onConflict:'challenge_id,user_id' })
  revalidatePath(`/event/${eventId}/challenges`)
}

export async function castVoteAction(attemptId:string, formData:FormData) {
  await requireUser()
  const supabase = await createClient()
  const value = String(formData.get('value') || '')
  const { error } = await supabase.rpc('cast_vote', { p_attempt_id:attemptId, p_value:value })
  if (error) redirect(q(`/attempt/${attemptId}`,'e',error.message))
  revalidatePath(`/attempt/${attemptId}`)
  redirect(q(`/attempt/${attemptId}`,'m','Vote enregistré.'))
}

export async function addCommentAction(attemptId:string, formData:FormData) {
  const user = await requireUser()
  const content = String(formData.get('content') || '').trim()
  if (!content) return
  const supabase = await createClient()
  const { error } = await supabase.from('comments').insert({ attempt_id:attemptId, user_id:user.id, content })
  if (error) redirect(q(`/attempt/${attemptId}`,'e',error.message))
  revalidatePath(`/attempt/${attemptId}`)
}

export async function cancelAttemptAction(attemptId:string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_attempt', { p_attempt_id:attemptId })
  if (error) redirect(q(`/attempt/${attemptId}`,'e',error.message))
  revalidatePath(`/attempt/${attemptId}`)
  redirect(q(`/attempt/${attemptId}`,'m','Tentative annulée.'))
}

export async function markNotificationsReadAction() {
  const user = await requireUser()
  const supabase = await createClient()
  await supabase.from('notifications').update({ read_at:new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  revalidatePath('/notifications')
}

export async function updateEventInfoAction(eventId:string, formData:FormData) {
  await requireUser(); const supabase=await createClient()
  const maxRaw=String(formData.get('max_members')||'').trim()
  const {error}=await supabase.rpc('update_event_info',{
    p_event_id:eventId,
    p_name:String(formData.get('name')||''),
    p_description:String(formData.get('description')||''),
    p_reward_text:String(formData.get('reward_text')||''),
    p_visibility:String(formData.get('visibility')||'private'),
    p_max_members:maxRaw?Number(maxRaw):null
  })
  if(error)redirect(q(`/event/${eventId}/admin`,'e',error.message))
  revalidatePath(`/event/${eventId}`); redirect(q(`/event/${eventId}/admin`,'m','Informations mises à jour.'))
}

export async function regenerateInviteAction(eventId:string) {
  await requireUser(); const supabase=await createClient()
  const {error}=await supabase.rpc('regenerate_invite_code',{p_event_id:eventId})
  if(error)redirect(q(`/event/${eventId}/admin`,'e',error.message))
  revalidatePath(`/event/${eventId}/admin`); redirect(q(`/event/${eventId}/admin`,'m','Nouveau code généré.'))
}

export async function banMemberAction(eventId:string,userId:string,formData:FormData) {
  await requireUser(); const supabase=await createClient()
  const {error}=await supabase.rpc('ban_event_member',{p_event_id:eventId,p_user_id:userId,p_reason:String(formData.get('reason')||'')})
  if(error)redirect(q(`/event/${eventId}/admin`,'e',error.message))
  revalidatePath(`/event/${eventId}/members`); redirect(q(`/event/${eventId}/admin`,'m','Membre banni.'))
}

export async function reportAttemptAction(attemptId:string, formData:FormData) {
  const user=await requireUser(); const supabase=await createClient()
  const {error}=await supabase.from('reports').insert({reporter_id:user.id,entity_type:'attempt',entity_id:attemptId,reason:String(formData.get('reason')||'other'),details:String(formData.get('details')||'')})
  if(error)redirect(q(`/attempt/${attemptId}`,'e',error.message))
  redirect(q(`/attempt/${attemptId}`,'m','Signalement envoyé à la modération.'))
}

export async function resolveReportAction(reportId:string) {
  await requireUser(); const supabase=await createClient()
  const {error}=await supabase.rpc('platform_resolve_report',{p_report_id:reportId})
  if(error)redirect(q('/admin','e',error.message))
  revalidatePath('/admin'); redirect(q('/admin','m','Signalement marqué comme résolu.'))
}

export async function toggleEventSuspensionAction(eventId:string) {
  await requireUser(); const supabase=await createClient()
  const {error}=await supabase.rpc('platform_toggle_event_suspension',{p_event_id:eventId})
  if(error)redirect(q('/admin','e',error.message))
  revalidatePath('/admin'); redirect(q('/admin','m','Statut de l’événement modifié.'))
}
