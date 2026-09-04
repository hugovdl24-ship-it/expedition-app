'use client'

import { useEffect } from 'react'

declare global { interface Window { adsbygoogle?: unknown[] } }

export function AdSlot({ kind='top' }: { kind?: 'top'|'rectangle' }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const slot = kind === 'top' ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP : process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECT

  useEffect(() => {
    if (client && slot) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
    }
  }, [client, slot])

  if (!client || !slot) {
    const isRectangle = kind === 'rectangle'
    return (
      <div className={`ad-slot ${isRectangle ? 'rectangle' : ''}`} aria-label="Emplacement publicitaire prévu">
        <div>
          <span className="ad-label">ESPACE SPONSORISÉ</span>
          <strong>{isRectangle ? 'Bloc publicitaire latéral' : 'Bannière publicitaire horizontale'}</strong>
          <small>{isRectangle ? 'Annonce responsive prévue dans le fil de l’expédition' : 'Annonce responsive prévue sous la navigation'}</small>
        </div>
      </div>
    )
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display:'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
