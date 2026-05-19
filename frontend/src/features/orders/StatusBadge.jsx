const STATUS_CONFIG = {
  INGRESADO:           { label: 'Ingresado',                  cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300' },
  EN_REVISION:         { label: 'En revisión',                cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  REVISADO:            { label: 'Revisado',                   cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  EN_ESPERA_MARCA:     { label: 'En espera de marca',         cls: 'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300' },
  NEGACION_GARANTIA:   { label: 'Negación de garantía',       cls: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300' },
  COTIZADO:            { label: 'Cotizado',                   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  EN_ESPERA_ABONO:     { label: 'En espera de abono',         cls: 'bg-pink-100   text-pink-700   dark:bg-pink-900/40   dark:text-pink-300' },
  EN_ESPERA_REPUESTOS: { label: 'En espera de repuestos',     cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  REPUESTOS_EN_TALLER: { label: 'Repuestos en taller',        cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
  EN_REPARACION:       { label: 'En reparación',              cls: 'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-300' },
  LISTO_PARA_ENTREGAR: { label: 'Listo para entregar',        cls: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300' },
  ENTREGADO:           { label: 'Entregado',                  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])
)

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.cls} ${className}`}>
      {config.label}
    </span>
  )
}
