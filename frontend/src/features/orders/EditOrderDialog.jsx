import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients'
import { brandsApi, equipmentApi } from '@/api/equipment'
import { ordersApi } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle } from 'lucide-react'

export default function EditOrderDialog({ order, open, onClose }) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({})
  const [productTypeFilter, setProductTypeFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then((r) => r.data),
    enabled: open,
  })
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.list().then((r) => r.data),
    enabled: open,
  })
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list().then((r) => r.data),
    enabled: open,
  })

  // Pre-poblar con datos actuales cuando abre el dialog
  useEffect(() => {
    if (!open || !order || equipment.length === 0) return

    const eq = order.equipment
    const currentEquip = equipment.find((e) => e.id === eq)

    setProductTypeFilter(currentEquip?.product_type ?? '')
    setBrandFilter(currentEquip?.brand ? String(currentEquip.brand) : '')

    setForm({
      client: String(order.client),
      equipment: String(eq),
      serial_number: order.serial_number ?? '',
      service_type: order.service_type,
      warranty_brand: order.warranty_brand ? String(order.warranty_brand) : '',
      brand_ot_number: order.brand_ot_number ?? '',
      problem_description: order.problem_description ?? '',
      received_condition: order.received_condition ?? '',
    })
  }, [open, order, equipment])

  const mutation = useMutation({
    mutationFn: (data) => ordersApi.updateCore(order.id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(['order', String(order.id)], res.data)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
  })

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    mutation.mutate({
      client: Number(form.client),
      equipment: Number(form.equipment),
      serial_number: form.serial_number || '',
      service_type: form.service_type,
      warranty_brand: form.warranty_brand ? Number(form.warranty_brand) : null,
      brand_ot_number: form.brand_ot_number || '',
      problem_description: form.problem_description,
      received_condition: form.received_condition,
    })
  }

  const isGarantia = form.service_type === 'GARANTIA'

  const clientOptions = clients.map((c) => ({
    value: String(c.id),
    label: c.name,
    sublabel: `${c.document_type} ${c.document_number}`,
  }))

  const productTypeOptions = useMemo(() => {
    const seen = new Set()
    return equipment
      .filter((e) => e.product_type && !seen.has(e.product_type) && seen.add(e.product_type))
      .map((e) => ({ value: e.product_type, label: e.product_type }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [equipment])

  const equipmentByType = useMemo(
    () => (productTypeFilter ? equipment.filter((e) => e.product_type === productTypeFilter) : equipment),
    [equipment, productTypeFilter],
  )

  const brandOptions = useMemo(() => [
    { value: '', label: 'Todas las marcas' },
    ...brands
      .filter((b) => !productTypeFilter || equipmentByType.some((e) => String(e.brand) === String(b.id)))
      .map((b) => ({ value: String(b.id), label: b.name })),
  ], [brands, productTypeFilter, equipmentByType])

  const modelOptions = useMemo(() => {
    const filtered = equipmentByType.filter((e) => !brandFilter || String(e.brand) === brandFilter)
    return filtered.map((e) => ({
      value: String(e.id),
      label: e.model || e.product_type || `Equipo #${e.id}`,
      sublabel: e.brand_detail?.name,
    }))
  }, [equipmentByType, brandFilter])

  const apiError = mutation.error?.response?.data
  const errorMessage = apiError
    ? Object.values(apiError).flat().join(' ')
    : mutation.error?.message

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar datos de la OT</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          <div className="space-y-1.5">
            <Label>Cliente <span className="text-destructive">*</span></Label>
            <Combobox
              options={clientOptions}
              value={form.client ?? ''}
              onChange={(v) => set('client', v)}
              placeholder="Buscar cliente…"
              searchPlaceholder="Nombre o documento…"
              emptyText="No se encontró el cliente."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de producto <span className="text-destructive">*</span></Label>
            <Combobox
              options={productTypeOptions}
              value={productTypeFilter}
              onChange={(v) => {
                setProductTypeFilter(v)
                setBrandFilter('')
                set('equipment', '')
              }}
              placeholder="Ej: Taladro inalámbrico…"
              searchPlaceholder="Buscar tipo de producto…"
              emptyText="No se encontró ese tipo de producto."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Combobox
                options={brandOptions}
                value={brandFilter}
                onChange={(v) => { setBrandFilter(v); set('equipment', '') }}
                placeholder="Todas las marcas"
                searchPlaceholder="Buscar marca…"
                emptyText="No se encontró la marca."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo <span className="text-destructive">*</span></Label>
              <Combobox
                options={modelOptions}
                value={form.equipment ?? ''}
                onChange={(v) => set('equipment', v)}
                placeholder="Buscar modelo…"
                searchPlaceholder="Modelo…"
                emptyText="No se encontró el modelo."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>N° de serie <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              value={form.serial_number ?? ''}
              onChange={(e) => set('serial_number', e.target.value)}
              placeholder="Serial de la unidad física"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de servicio <span className="text-destructive">*</span></Label>
            <div className="flex gap-3">
              {[{ value: 'COBRO', label: 'Al cobro' }, { value: 'GARANTIA', label: 'Garantía' }].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('service_type', value)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    form.service_type === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isGarantia && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="space-y-1.5">
                <Label>N° OT generado por la marca</Label>
                <Input
                  value={form.brand_ot_number ?? ''}
                  onChange={(e) => set('brand_ot_number', e.target.value)}
                  placeholder="Ej: GAR-2024-001"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Descripción del problema <span className="text-destructive">*</span></Label>
            <Textarea
              required
              value={form.problem_description ?? ''}
              onChange={(e) => set('problem_description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Estado de recepción <span className="text-destructive">*</span></Label>
            <Textarea
              required
              value={form.received_condition ?? ''}
              onChange={(e) => set('received_condition', e.target.value)}
              rows={2}
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !form.client || !form.equipment}
              className="min-w-24"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Guardando…
                </span>
              ) : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
