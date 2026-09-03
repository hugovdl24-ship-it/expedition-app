'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ProfileEditor({ userId, email, profile }: { userId:string; email:string; profile:any }) {
  const supabase=useMemo(()=>createClient(),[]); const router=useRouter()
  const [username,setUsername]=useState(profile.username||''); const [bio,setBio]=useState(profile.bio||''); const [newEmail,setNewEmail]=useState(email||'')
  const [avatar,setAvatar]=useState<File|null>(null); const [currentPassword,setCurrentPassword]=useState(''); const [newPassword,setNewPassword]=useState(''); const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('')
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{
    if(username.trim().length<3)throw new Error('Le pseudo doit contenir au moins 3 caractères.')
    let avatarUrl=profile.avatar_url||null
    if(avatar){if(!avatar.type.startsWith('image/'))throw new Error('La photo de profil doit être une image.');if(avatar.size>5*1024*1024)throw new Error('Avatar trop lourd (5 Mo max).');const safe=avatar.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${userId}/${Date.now()}_${safe}`;const {error:upErr}=await supabase.storage.from('avatars').upload(path,avatar,{contentType:avatar.type,upsert:false});if(upErr)throw upErr;const {data}=supabase.storage.from('avatars').getPublicUrl(path);avatarUrl=data.publicUrl}
    const {error:profileErr}=await supabase.from('profiles').update({username:username.trim().toLowerCase(),bio:bio.slice(0,500),avatar_url:avatarUrl}).eq('id',userId);if(profileErr)throw profileErr
    if(newEmail.trim().toLowerCase()!==email.toLowerCase()){const {error:emailErr}=await supabase.auth.updateUser({email:newEmail.trim().toLowerCase()});if(emailErr)throw emailErr;setMessage('Profil enregistré. Vérifie les emails de confirmation pour valider la nouvelle adresse.')}
    if(newPassword||currentPassword||confirm){if(newPassword.length<8)throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');if(newPassword!==confirm)throw new Error('Les nouveaux mots de passe ne correspondent pas.');if(!currentPassword)throw new Error('Entre ton mot de passe actuel.');const {error:reauthErr}=await supabase.auth.signInWithPassword({email,password:currentPassword});if(reauthErr)throw new Error('Mot de passe actuel incorrect.');const {error:pwErr}=await supabase.auth.updateUser({password:newPassword});if(pwErr)throw pwErr;setCurrentPassword('');setNewPassword('');setConfirm('');setMessage('Profil et mot de passe mis à jour.')}
    if(!message)setMessage('Profil mis à jour.');router.refresh()
  }catch(err:any){setError(err?.message||'Impossible de modifier le profil.')}finally{setBusy(false)}}
  return <form onSubmit={submit}><div className="formgrid"><label>Pseudo<input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={30}/></label><label>Email<input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)}/></label><label className="span2">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={4}/></label><label className="span2 upload-drop">Nouvelle photo<input type="file" accept="image/*" onChange={e=>setAvatar(e.target.files?.[0]||null)}/><small className="hint">L’image est conservée entière dans le cadre. 5 Mo max.</small></label></div><hr/><h2>Sécurité</h2><p className="hint">Laisse vide si tu ne souhaites pas changer de mot de passe.</p><div className="formgrid"><label>Mot de passe actuel<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password"/></label><label>Nouveau mot de passe<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} autoComplete="new-password"/></label><label>Confirmer<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} autoComplete="new-password"/></label></div>{message&&<div className="flash ok">{message}</div>}{error&&<div className="flash err">{error}</div>}<button className="button" disabled={busy}>{busy?'Enregistrement…':'Enregistrer les modifications'}</button></form>
}
