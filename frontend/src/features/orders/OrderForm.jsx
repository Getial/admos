import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients'
import { brandsApi, equipmentApi } from '@/api/equipment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { AlertCircle } from 'lucide-react'

const EMPTY = {
  client: '',
  equipment: '',
  service_type: 'COBRO',
  serial_number: '',
  warranty_brand: '',
  brand_ot_number: '',
  problem_description: '',
  received_condition: '',
  revision_cost: '',
  revision_paid: false,
  labor_cost: '',
}

export default function OrderForm({ onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(EMPTY)
  const [productTypeFilter, setProductTypeFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [showLaborCost, setShowLaborCost] = useState(false)

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then((r) => r.data),
  })

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.list().then((r) => r.data),
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list().then((r) => r.data),
  })

  // Precargar costos y marca de garantía al seleccionar equipo
  useEffect(() => {
    if (!form.equipment) return
    const eq = equipment.find((e) => String(e.id) === form.equipment)
    if (eq) {
      const laborVal = eq.default_labor_cost != null ? Math.round(Number(eq.default_labor_cost)) : ''
      setForm((prev) => ({
        ...prev,
        revision_cost: eq.default_revision_cost != null ? Math.round(Number(eq.default_revision_cost)) : '',
        labor_cost: laborVal,
        warranty_brand: eq.brand ? String(eq.brand) : '',
      }))
      if (laborVal !== '') setShowLaborCost(true)
      if (eq.brand) setBrandFilter(String(eq.brand))
    }
  }, [form.equipment, equipment])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      client: Number(form.client),
      equipment: Number(form.equipment),
      warranty_brand: form.warranty_brand ? Number(form.warranty_brand) : null,
      revision_cost: form.revision_cost === '' ? null : form.revision_cost,
      labor_cost: form.labor_cost === '' ? null : form.labor_cost,
    }
    onSubmit(payload)
  }

  const apiError = error?.response?.data
  const errorMessage = apiError
    ? Object.values(apiError).flat().join(' ')
    : error?.message

  const isGarantia = form.service_type === 'GARANTIA'

  // Opciones para comboboxes
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

  const equipmentByProductType = useMemo(
    () => (productTypeFilter ? equipment.filter((e) => e.product_type === productTypeFilter) : equipment),
    [equipment, productTypeFilter],
  )

  const brandOptions = useMemo(() => [
    { value: '', label: 'Todas las marcas' },
    ...brands
      .filter((b) => !productTypeFilter || equipmentByProductType.some((e) => String(e.brand) === String(b.id)))
      .map((b) => ({ value: String(b.id), label: b.name })),
  ], [brands, productTypeFilter, equipmentByProductType])

  const modelOptions = useMemo(() => {
    const filtered = equipmentByProductType.filter((e) => !brandFilter || String(e.brand) === brandFilter)
    return filtered.map((e) => ({
      value: String(e.id),
      label: e.model || e.product_type || `Equipo #${e.id}`,
      sublabel: e.brand_detail?.name,
    }))
  }, [equipmentByProductType, brandFilter])

  const selectedEquipmentBrandName = (() => {
    const eq = equipment.find((e) => String(e.id) === form.equipment)
    return eq?.brand_detail?.name ?? null
  })()

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Cliente */}
      <div className="space-y-1.5">
        <Label>Cliente <span className="text-destructive">*</span></Label>
        <Combobox
          options={clientOptions}
          value={form.client}
          onChange={(v) => set('client', v)}
          placeholder="Buscar cliente…"
          searchPlaceholder="Nombre o documento…"
          emptyText="No se encontró el cliente."
        />
      </div>

      {/* Tipo de producto */}
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

      {/* Marca + Modelo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Marca</Label>
          <Combobox
            options={brandOptions}
            value={brandFilter}
            onChange={(v) => {
              setBrandFilter(v)
              set('equipment', '')
            }}
            placeholder="Todas las marcas"
            searchPlaceholder="Buscar marca…"
            emptyText="No se encontró la marca."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Modelo <span className="text-destructive">*</span></Label>
          <Combobox
            options={modelOptions}
            value={form.equipment}
            onChange={(v) => set('equipment', v)}
            placeholder="Buscar modelo…"
            searchPlaceholder="Modelo…"
            emptyText="No se encontró el modelo."
          />
        </div>
      </div>

      {/* Serial */}
      <div className="space-y-1.5">
        <Label>
          N° de serie <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          value={form.serial_number}
          onChange={(e) => set('serial_number', e.target.value)}
          placeholder="Serial de la unidad física recibida"
          autoComplete="off"
        />
      </div>

      {/* Tipo de servicio */}
      <div className="space-y-1.5">
        <Label>Tipo de servicio <span className="text-destructive">*</span></Label>
        <div className="flex gap-3">
          {[
            { value: 'COBRO', label: 'Al cobro' },
            { value: 'GARANTIA', label: 'Garantía' },
          ].map(({ value, label }) => (
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

      {/* Campos de garantía — solo N° OT, la marca viene del equipo */}
      {isGarantia && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-3">
          {selectedEquipmentBrandName && (
            <p className="text-sm text-muted-foreground">
              Garantía por <span className="font-medium text-foreground">{selectedEquipmentBrandName}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label>N° OT generado por la marca</Label>
            <Input
              value={form.brand_ot_number}
              onChange={(e) => set('brand_ot_number', e.target.value)}
              placeholder="Ej: GAR-2024-001"
            />
          </div>
        </div>
      )}

      {/* Descripción y condición */}
      <div className="space-y-1.5">
        <Label>Descripción del problema <span className="text-destructive">*</span></Label>
        <Textarea
          required
          value={form.problem_description}
          onChange={(e) => set('problem_description', e.target.value)}
          placeholder="¿Cuál es la falla reportada por el cliente?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Estado de recepción <span className="text-destructive">*</span></Label>
        <Textarea
          required
          value={form.received_condition}
          onChange={(e) => set('received_condition', e.target.value)}
          placeholder="Condición física y accesorios recibidos con el equipo…"
          rows={2}
        />
      </div>

      {/* Costos — solo para Al cobro */}
      {!isGarantia && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Costo de revisión</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.revision_cost}
                onChange={(e) => set('revision_cost', e.target.value)}
                placeholder="0"
              />
              <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.revision_paid}
                  onChange={(e) => set('revision_paid', e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">Pagado</span>
              </label>
            </div>
          </div>

          {showLaborCost ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Mano de obra</Label>
                <button
                  type="button"
                  onClick={() => { setShowLaborCost(false); set('labor_cost', '') }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Quitar
                </button>
              </div>
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.labor_cost}
                onChange={(e) => set('labor_cost', e.target.value)}
                placeholder="0"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLaborCost(true)}
              className="text-sm text-primary hover:underline"
            >
              + Agregar mano de obra (cotización)
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !form.client || !form.equipment}
          className="min-w-24"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Guardando…
            </span>
          ) : 'Crear OT'}
        </Button>
      </div>
    </form>
  )
}
