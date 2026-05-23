import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import StatusBadge from './StatusBadge'
import { AlertCircle, ArrowRight, Plus, Trash2, Camera } from 'lucide-react'
import { getApiError } from '@/lib/apiError'
import { usersApi } from '@/api/users'

const EMPTY_PART = { description: '', quantity: 1, unit_price: '', available_in_shop: false }

function ExistingPartRow({ part, onUpdate, onRemove, showPrice }) {
  const [desc, setDesc]     = useState(part.description)
  const [qty, setQty]       = useState(String(part.quantity))
  const [price, setPrice]   = useState(part.unit_price != null ? String(part.unit_price) : '')
  const [avail, setAvail]   = useState(part.available_in_shop)

  useEffect(() => {
    setDesc(part.description)
    setQty(String(part.quantity))
    setPrice(part.unit_price != null ? String(part.unit_price) : '')
    setAvail(part.available_in_shop)
  }, [part])

  function commit(overrides = {}) {
    onUpdate({
      description: overrides.description ?? desc,
      quantity: Number(overrides.qty ?? qty) || 1,
      unit_price: (overrides.price ?? price) !== '' ? (overrides.price ?? price) : null,
      available_in_shop: overrides.avail ?? avail,
    })
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-sm">
      <Input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => commit()}
        className="h-7 flex-1 text-sm min-w-0"
      />
      <Input
        type="number" min="1"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onBlur={() => commit()}
        className="h-7 w-12 text-sm text-center shrink-0"
      />
      {showPrice && (
        <Input
          type="number" min="0" step="1" inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => commit()}
          placeholder="Precio"
          className="h-7 w-24 text-sm shrink-0"
        />
      )}
      <label className="flex items-center gap-1 shrink-0 cursor-pointer select-none text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={avail}
          onChange={(e) => { setAvail(e.target.checked); commit({ avail: e.target.checked }) }}
          className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
        />
        Disp.
      </label>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function TransitionDialog({ open, onOpenChange, order, onTransition, loading, error, onUpdatePart, onRemovePart }) {
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [parts, setParts] = useState([])
  const [newPart, setNewPart] = useState(EMPTY_PART)
  const [wasRepaired, setWasRepaired] = useState(true)
  const [reviewingTechId, setReviewingTechId] = useState('')
  const [repairTechId, setRepairTechId] = useState('')

  const { data: technicians = [] } = useQuery({
    queryKey: ['users', 'tecnico'],
    queryFn: () => usersApi.list('').then((r) => r.data.filter((u) => u.role === 'TECNICO' || u.role === 'JEFE_TALLER')),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setSelected(null); setNotes(''); setParts([]); setNewPart(EMPTY_PART)
      setWasRepaired(true); setReviewingTechId(''); setRepairTechId('')
    }
  }, [open])

  useEffect(() => {
    if (selected !== 'REVISADO') setParts([])
    if (selected === 'LISTO_PARA_ENTREGAR') setWasRepaired(true)
  }, [selected])

  const validTransitions = order?.valid_transitions ?? []
  const isGarantia = order?.service_type === 'GARANTIA'
  const isListo = selected === 'LISTO_PARA_ENTREGAR'
  const showRepairCheck = !isGarantia && isListo
  const showParts = selected === 'REVISADO' || (isListo && wasRepaired)
  const requiresDiagnostic = isGarantia && selected === 'REVISADO'
  const hasPhotos = (order?.diagnostic_photos?.length ?? 0) > 0
  const needsReviewingTech = isListo && !order?.reviewing_technician
  const needsRepairTech = isListo && !order?.repair_technician

  function addPart() {
    if (!newPart.description.trim()) return
    setParts((prev) => [...prev, { ...newPart }])
    setNewPart(EMPTY_PART)
  }

  function removePart(idx) {
    setParts((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleOpenChange(val) {
    if (!val) { setSelected(null); setNotes(''); setParts([]); setNewPart(EMPTY_PART) }
    onOpenChange(val)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    const payload = { new_status: selected, notes }
    if (showRepairCheck) payload.was_repaired = wasRepaired
    if (showParts && parts.length > 0) {
      payload.spare_parts = parts.map((p) => ({
        description: p.description,
        quantity: Number(p.quantity),
        unit_price: p.unit_price !== '' ? p.unit_price : null,
        available_in_shop: p.available_in_shop,
        client_pays: !isGarantia,
      }))
    }
    if (needsReviewingTech && reviewingTechId) payload.reviewing_technician = Number(reviewingTechId)
    if (needsRepairTech   && repairTechId)    payload.repair_technician    = Number(repairTechId)
    onTransition(payload)
  }

  const errorMessage = getApiError(error)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambiar estado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={order?.status} />
            <ArrowRight className="h-3.5 w-3.5" />
            <span>seleccionar nuevo estado</span>
          </div>

          <div className="flex flex-col gap-2">
            {validTransitions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  selected === s
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
                }`}
              >
                <StatusBadge status={s} />
                {selected === s && <span className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>

          {/* Repuestos — solo en REVISADO */}
          {showParts && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isListo ? 'Repuestos cambiados en la reparación' : 'Repuestos identificados'}
              </p>

              {/* Repuestos ya registrados en la OT — editables */}
              {order?.spare_parts?.length > 0 && (
                <div className="space-y-1">
                  {order.spare_parts.map((p) => (
                    <ExistingPartRow
                      key={p.id}
                      part={p}
                      showPrice={!isGarantia || order.status === 'NEGACION_GARANTIA'}
                      onUpdate={(data) => onUpdatePart?.(p.id, data)}
                      onRemove={() => onRemovePart?.(p.id)}
                    />
                  ))}
                  {parts.length > 0 && <div className="border-t border-border/50 my-1" />}
                </div>
              )}

              {/* Repuestos nuevos a agregar con esta transición */}
              {parts.length > 0 && (
                <div className="space-y-1">
                  {parts.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-sm">
                      <span className="flex-1 truncate">{p.description}</span>
                      <span className="text-muted-foreground shrink-0">×{p.quantity}</span>
                      <span className="text-muted-foreground shrink-0 w-20 text-right">
                        {p.unit_price !== '' ? `$${Number(p.unit_price).toLocaleString('es-CO')}` : 'Sin precio'}
                      </span>
                      <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded-full ${p.available_in_shop ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.available_in_shop ? 'En taller' : 'Por cotizar'}
                      </span>
                      <button type="button" onClick={() => removePart(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario agregar repuesto */}
              <div className="space-y-2">
                <Input
                  value={newPart.description}
                  onChange={(e) => setNewPart((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Nombre del repuesto…"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPart() } }}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart((p) => ({ ...p, quantity: e.target.value }))}
                    className="h-8 text-sm w-16"
                    placeholder="Cant."
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={newPart.unit_price}
                    onChange={(e) => setNewPart((p) => ({ ...p, unit_price: e.target.value }))}
                    placeholder="Precio unit. (opcional)"
                    className="h-8 text-sm flex-1"
                  />
                  <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={newPart.available_in_shop}
                      onChange={(e) => setNewPart((p) => ({ ...p, available_in_shop: e.target.checked }))}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                    />
                    Disponible
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addPart}
                    disabled={!newPart.description.trim()}
                    className="h-8 px-2 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ¿Fue reparado? — solo COBRO → LISTO_PARA_ENTREGAR */}
          {showRepairCheck && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resultado del servicio</p>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={wasRepaired}
                  onChange={(e) => setWasRepaired(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <span className="text-sm">El equipo fue reparado</span>
              </label>
              {!wasRepaired && (
                <p className="text-xs text-muted-foreground pl-7">
                  Solo se cobrará la revisión. Si ya fue pagada, el saldo quedará en $0.
                </p>
              )}
            </div>
          )}

          {/* Asignación de técnicos — solo cuando van a LISTO sin técnico asignado */}
          {(needsReviewingTech || needsRepairTech) && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Asignación de técnicos
              </p>
              {needsReviewingTech && (
                <div className="space-y-1.5">
                  <Label htmlFor="reviewing-tech" className="text-sm">
                    Técnico que revisó <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="reviewing-tech"
                    value={reviewingTechId}
                    onChange={(e) => setReviewingTechId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Seleccionar técnico…</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name ? `${t.first_name} ${t.last_name}`.trim() : t.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {needsRepairTech && (
                <div className="space-y-1.5">
                  <Label htmlFor="repair-tech" className="text-sm">
                    Técnico que reparó <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="repair-tech"
                    value={repairTechId}
                    onChange={(e) => setRepairTechId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Seleccionar técnico…</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name ? `${t.first_name} ${t.last_name}`.trim() : t.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Aviso de fotos obligatorias en garantía → revisado */}
          {requiresDiagnostic && !hasPhotos && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
              <Camera className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Antes de confirmar, sube al menos una foto de evidencia en el detalle de la OT.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="transition-notes">
              Diagnóstico{requiresDiagnostic
                ? <span className="text-destructive"> *</span>
                : <span className="text-muted-foreground font-normal"> (opcional)</span>}
            </Label>
            <Textarea
              id="transition-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={requiresDiagnostic
                ? 'Describe el diagnóstico técnico del equipo…'
                : 'Observaciones sobre el cambio de estado…'}
              rows={requiresDiagnostic ? 3 : 2}
              required={requiresDiagnostic}
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !selected || loading ||
                (requiresDiagnostic && (!notes.trim() || !hasPhotos)) ||
                (needsReviewingTech && !reviewingTechId) ||
                (needsRepairTech && !repairTechId)
              }
              className="min-w-24"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Guardando…
                </span>
              ) : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
