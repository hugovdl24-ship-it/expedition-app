import { requireUser } from '@/lib/auth'
import { CreateEventForm } from '@/components/CreateEventForm'

export const metadata={title:'Créer une expédition'}
export default async function NewEvent(){await requireUser();return <section className="card narrow"><div className="eyebrow">NOUVEAU CAMP</div><h1>Créer une expédition</h1><p>Le camp peut ouvrir maintenant, mais les défis et les points restent verrouillés jusqu’à la date de départ.</p><CreateEventForm/></section>}
