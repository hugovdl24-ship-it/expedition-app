import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base=process.env.NEXT_PUBLIC_SITE_URL||'https://expedition-quest.netlify.app'
  const now=new Date()
  return [
    {url:`${base}/`,lastModified:now,changeFrequency:'weekly',priority:1},
    {url:`${base}/explore`,lastModified:now,changeFrequency:'daily',priority:.9},
    {url:`${base}/support`,lastModified:now,changeFrequency:'monthly',priority:.5},
    {url:`${base}/privacy`,lastModified:now,changeFrequency:'monthly',priority:.4},
    {url:`${base}/terms`,lastModified:now,changeFrequency:'monthly',priority:.4},
    {url:`${base}/login`,lastModified:now,changeFrequency:'monthly',priority:.3},
    {url:`${base}/register`,lastModified:now,changeFrequency:'monthly',priority:.3},
  ]
}
