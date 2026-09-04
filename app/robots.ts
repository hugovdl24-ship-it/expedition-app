import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base=process.env.NEXT_PUBLIC_SITE_URL||'https://expedition-quest.netlify.app'
  return {
    rules:[
      {userAgent:'*',allow:['/','/explore','/support','/privacy','/terms','/login','/register','/event/'],disallow:['/admin/','/notifications/','/attempt/','/event/new','/reset-password']},
      {userAgent:'Mediapartners-Google',allow:'/'},
      {userAgent:'Googlebot',allow:'/'},
    ],
    sitemap:`${base}/sitemap.xml`,
  }
}
