import Link from 'next/link'
import { Flash } from '@/components/Flash'
export default async function CheckEmail({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const sp=await searchParams;return <section className="card narrow empty-state"><div className="bigicon">📮</div><h1>Vérifie ta boîte mail</h1><Flash message={sp.m} error={sp.e}/><p>On t’a envoyé un lien de confirmation. Clique dessus pour activer ton compte Expédition.</p><Link className="button" href="/login">Retour à la connexion</Link></section>}
