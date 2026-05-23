/** "15 may. 2026, 10:30 a.m." */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** "15/05/2026" */
export function formatDateShort(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' }).format(new Date(iso))
}

/** "$1.200.000" | "—" para null */
export function formatCost(value) {
  if (value == null) return '—'
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

/** "$1.200.000" | null para null/0 (uso en impresión) */
export function formatCostOrNull(value) {
  if (value == null || value === '' || Number(value) === 0) return null
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}
