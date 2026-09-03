'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AttemptUploader({ eventId, userId, challenges, initialChallenge }: { eventId:string; userId:string; challenges:any[]; initialChallenge?:string }) {
  const router=useRouter(); const supabase=useMemo(()=>createClient(),[])
  const [challengeId,setChallengeId]=useState(initialChallenge||challenges[0]?.id||'')
  const [content,setContent]=useState(''); const [files,setFiles]=useState<File[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  const previews=useMemo(()=>files.map(f=>({file:f,url:URL.createObjectURL(f)})),[files])
  async function submit(e:React.FormEvent){
    e.preventDefault(); setBusy(true); setError('')
    try{
      if(!challengeId)throw new Error('Choisis un défi.')
      if(!files.length)throw new Error('Ajoute au moins une photo ou une vidéo comme preuve.')
      const {data:attemptId,error:attemptError}=await supabase.rpc('create_attempt',{p_challenge_id:challengeId,p_content:content})
      if(attemptError||!attemptId)throw attemptError||new Error('Impossible de créer la tentative.')
      for(let i=0;i<files.length;i++){
        const file=files[i]
        const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const path=`${eventId}/${attemptId}/${userId}/${Date.now()}_${i}_${safe}`
        const {error:uploadError}=await supabase.storage.from('attempt-media').upload(path,file,{upsert:false,contentType:file.type})
        if(uploadError)throw uploadError
        const mediaType=file.type.startsWith('video/')?'video':'image'
        const {error:regError}=await supabase.rpc('register_attempt_media',{p_attempt_id:attemptId,p_storage_path:path,p_media_type:mediaType,p_position:i})
        if(regError)throw regError
      }
      router.push(`/attempt/${attemptId}?m=${encodeURIComponent('Tentative publiée.')}`); router.refresh()
    }catch(err:any){setError(err?.message||'Une erreur est survenue.')}finally{setBusy(false)}
  }
  return <form onSubmit={submit}>
    {error&&<div className="flash err">{error}</div>}
    <label>Défi<select value={challengeId} onChange={e=>setChallengeId(e.target.value)} required>{challenges.map(c=><option value={c.id} key={c.id}>{c.title} · {c.points} pts{c.challenge_type==='exclusive'?' · exclusif':''}</option>)}</select></label>
    <label>Ton récit<textarea value={content} onChange={e=>setContent(e.target.value)} rows={4} placeholder="3 heures sous la pluie mais c’est fait…"/></label>
    <label className="upload-drop">Photos / vidéos<input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/><small className="hint">Les fichiers sont envoyés directement vers le stockage privé Supabase. 50 Mo max par fichier.</small></label>
    {!!previews.length&&<div className="media-preview">{previews.map((p,i)=><div className="media-preview-item" key={i}>{p.file.type.startsWith('video/')?<video src={p.url} controls/>:<img src={p.url} alt="Aperçu"/>}</div>)}</div>}
    <button className="button" disabled={busy||!challenges.length}>{busy?'Envoi en cours…':'Publier ma tentative'}</button>
  </form>
}
