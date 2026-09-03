import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditor } from '@/components/ProfileEditor'
export default async function EditProfile(){const user=await requireUser();const supabase=await createClient();const {data:profile}=await supabase.from('profiles').select('*').eq('id',user.id).single();return <section className="card narrow profile-editor"><div className="eyebrow">TON CARNET</div><h1>Modifier mon profil</h1><p>Change ton identité, ton avatar ou la sécurité de ton compte.</p><ProfileEditor userId={user.id} email={user.email||''} profile={profile}/></section>}
