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
  if (!client || !slot) return <div className={`ad-slot ${kind === 'rectangle' ? 'rectangle' : ''}`}>Espace sponsorisé</div>
  return <ins className="adsbygoogle" style={{ display:'block' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
}
