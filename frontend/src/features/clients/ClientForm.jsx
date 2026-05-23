import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import { getApiError } from '@/lib/apiError'

const EMPTY = { document_type: 'CEDULA', document_number: '', name: '', phone: '', address: '' }

export default function ClientForm({ initial, onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(initial ?? EMPTY)
  }, [initial])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(form)
  }

  const errorMessage = getApiError(error)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="doc-type">
            Tipo de documento <span className="text-destructive">*</span>
          </Label>
          <Select value={form.document_type} onValueChange={(v) => set('document_type', v)}>
            <SelectTrigger id="doc-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CEDULA">Cédula</SelectItem>
              <SelectItem value="NIT">NIT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-number">
            Número <span className="text-destructive">*</span>
          </Label>
          <Input
            id="doc-number"
            required
            inputMode="numeric"
            autoComplete="off"
            value={form.document_number}
            onChange={(e) => set('document_number', e.target.value)}
            placeholder="12345678"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">
          Nombre / Razón social <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          required
          autoComplete="off"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Nombre completo o empresa"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">
          Teléfono <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          required
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="3001234567"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">
          Dirección <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="address"
          autoComplete="street-address"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Ciudad o dirección"
        />
      </div>

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
        <Button type="submit" disabled={loading} className="min-w-24">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Guardando…
            </span>
          ) : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
