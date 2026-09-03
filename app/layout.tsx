import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Header } from '@/components/Header'
import { AdSlot } from '@/components/AdSlot'

export const metadata: Metadata = {
  title: { default: 'Expédition', template: '%s · Expédition' },
  description: 'Créez une expédition, relevez des défis, publiez vos preuves et grimpez au classement.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/logo.png', apple: '/logo.png' }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  return <html lang="fr"><body>
    {client && <Script async strategy="afterInteractive" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossOrigin="anonymous" />}
    <Header />
    <main className="shell"><AdSlot kind="top" />{children}</main>
    <footer>
      <div>Expédition · Faites des trucs dont vous parlerez encore dans 10 ans.</div>
      <small><a href="/support">Soutenir les développeurs</a> · <a href="/privacy">Confidentialité</a> · <a href="/terms">Conditions</a></small>
    </footer>
  </body></html>
}
