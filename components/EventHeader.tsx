import Link from 'next/link'
import { fmtDate } from '@/lib/format'

export function EventHeader({ event, memberCount, isAdmin, active }: { event:any; memberCount:number; isAdmin:boolean; active:string }) {
  const started = new Date(event.start_at) <= new Date()
  return <>
    <section className="eventhero">
      <div className="eyebrow">{event.visibility === 'public' ? 'Événement public' : 'Événement privé'} · {started ? 'EN COURS' : 'CAMP OUVERT'}</div>
      <h1>{event.name}</h1>
      <p>{event.description}</p>
      <div className="event-stats">
        <span className="event-stat">👥 {memberCount}{event.max_members ? `/${event.max_members}` : ''} membres</span>
        {!started && <span className="event-stat">🚩 Départ {fmtDate(event.start_at)}</span>}
        <span className="event-stat">🏁 Fin {fmtDate(event.end_at)}</span>
        {event.reward_text && <span className="event-stat gold">🎁 {event.reward_text}</span>}
      </div>
    </section>
    <nav className="eventnav">
      <Link className={active==='feed'?'active':''} href={`/event/${event.id}`}>🏕️ Fil</Link>
      <Link className={active==='challenges'?'active':''} href={`/event/${event.id}/challenges`}>🗺️ Défis</Link>
      <Link className="primarytab" href={`/event/${event.id}/attempt/new`}>＋ Publier</Link>
      <Link className={active==='leaderboard'?'active':''} href={`/event/${event.id}/leaderboard`}>🏆 Classement</Link>
      <Link className={active==='members'?'active':''} href={`/event/${event.id}/members`}>👥 Membres</Link>
      {isAdmin && <Link className={active==='admin'?'active':''} href={`/event/${event.id}/admin`}>⚙️ Admin</Link>}
    </nav>
  </>
}
