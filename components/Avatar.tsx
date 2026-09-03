import { initials } from '@/lib/format'

export function Avatar({ username, url, size='md' }: { username?: string | null; url?: string | null; size?: 'sm'|'md'|'lg'|'xl' }) {
  const cls = `avatar ${size}`
  if (url) return <img className={cls} src={url} alt={username || 'Avatar'} />
  return <span className={cls}>{initials(username)}</span>
}
