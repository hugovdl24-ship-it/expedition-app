import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Flash } from '@/components/Flash'
import { fmtDate } from '@/lib/format'

export default async function Home({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <>
    <Flash message={sp.m} error={sp.e} />
    <section className="landing-grid">
      <div className="landing">
        <div className="eyebrow">LE JEU DE DÉFIS QUI DURE VRAIMENT</div>
        <h1>Faites des trucs dont vous parlerez encore dans 10 ans.</h1>
        <p>Créez une expédition, préparez une liste de défis absurdes, publiez les preuves, laissez le groupe voter et découvrez qui ira le plus loin.</p>
        <div className="actions"><Link className="button" href="/register">Créer mon compte</Link><Link className="button ghost" href="/explore">Explorer les expéditions</Link><a className="button ghost" href="#comment-ca-marche">Comment ça marche</a></div>
      </div>
      <div className="landing-side"><img className="landing-logo" src="/logo.png" alt="Logo Expédition" /></div>
    </section>
    <section className="steps" id="comment-ca-marche">
      <article className="card step-card"><h3>Créez le camp</h3><p>Choisissez vos règles, une date de départ et invitez votre groupe avant le lancement.</p></article>
      <article className="card step-card"><h3>Préparez les défis</h3><p>L’admin prépare la liste en secret. Au départ, tout le monde découvre la même mission.</p></article>
      <article className="card step-card"><h3>Montrez les preuves</h3><p>Photos et vidéos s’affichent en entier, sans recadrage automatique.</p></article>
      <article className="card step-card"><h3>Le groupe tranche</h3><p>Votes, validation automatique, points et classement jusqu’à la ligne d’arrivée.</p></article>
    </section>
    <section className="card support-card"><div className="eyebrow">FAIRE VIVRE LE PROJET</div><h2>Soutenir Expédition</h2><p>Les soutiens servent à payer l’hébergement, le stockage des vidéos et le développement des prochaines fonctionnalités.</p><Link className="button ghost" href="/support">❤️ Soutenir les développeurs</Link></section>
  </>

  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  const { data: memberships } = await supabase.from('event_members').select('event_id,role,status').eq('user_id', user.id).eq('status','active')
  const ids = (memberships || []).map((m:any)=>m.event_id)
  let events:any[] = []
  if (ids.length) {
    const { data } = await supabase.from('events').select('*').in('id', ids).order('created_at',{ascending:false})
    events = data || []
  }
  return <>
    <Flash message={sp.m} error={sp.e} />
    <section className="pagehead"><div><div className="eyebrow">TON CAMP DE BASE</div><h1>Salut, {profile?.username || 'explorateur'}.</h1><p>Reprends une expédition ou ouvre un nouveau camp.</p></div><div className="actions"><Link className="button" href="/event/new">＋ Créer</Link><Link className="button ghost" href="/join">Rejoindre</Link></div></section>
    <div className="grid">
      {events.map((e:any)=>{
        const started = new Date(e.start_at) <= new Date()
        return <Link className="card eventcard" href={`/event/${e.id}`} key={e.id}>
          <div className="eyebrow">{e.visibility.toUpperCase()} · {started?'EN COURS':'CAMP OUVERT'}</div>
          <h2>{e.name}</h2><p>{e.description}</p>
          <div className="event-meta"><span>{started ? `🏁 Fin ${fmtDate(e.end_at)}` : `🚩 Départ ${fmtDate(e.start_at)}`}</span><span>{e.reward_text ? `🎁 ${e.reward_text}` : '🧭 Aucun lot'}</span></div>
        </Link>
      })}
      {!events.length && <div className="card empty-state"><div className="bigicon">🏕️</div><h2>Aucune expédition</h2><p>Crée ton premier camp ou rejoins tes amis avec un code d’invitation.</p></div>}
    </div>
  </>
}
