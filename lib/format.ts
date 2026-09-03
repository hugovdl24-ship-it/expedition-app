export function fmtDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function dateInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

export function initials(name?: string | null) {
  return (name || '?').slice(0, 2).toUpperCase()
}
