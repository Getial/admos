import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

const EMPTY = { name: '', is_authorized: false }

export default function BrandForm({ initial, onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(initial ?? EMPTY)
  }, [initial])

  const apiError = error?.response?.data
  const errorMessage = apiError
    ? Object.values(apiError).flat().join(' ')
    : error?.message

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="brand-name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="brand-name"
          required
          autoFocus
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Ej: Bosch, Makita, Dewalt"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="is-authorized"
          type="checkbox"
          checked={form.is_authorized}
          onChange={(e) => setForm((p) => ({ ...p, is_authorized: e.target.checked }))}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        />
        <Label htmlFor="is-authorized" className="cursor-pointer font-normal">
          Taller autorizado por esta marca
        </Label>
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
