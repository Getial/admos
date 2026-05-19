import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AlertCircle, Search, UserPlus, Pencil, ShieldCheck } from 'lucide-react'

const ROLES = [
  { value: 'RECEPCIONISTA', label: 'Recepcionista' },
  { value: 'TECNICO',       label: 'Técnico' },
  { value: 'JEFE_TALLER',   label: 'Jefe de taller' },
]

const ROLE_COLORS = {
  RECEPCIONISTA: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  TECNICO:       'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  JEFE_TALLER:   'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

const EMPTY_FORM = {
  username: '', first_name: '', last_name: '',
  email: '', phone: '', role: '', password: '',
}

function UserForm({ initial, onSubmit, onCancel, loading, error }) {
  const isEdit = !!initial
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (initial) {
      setForm({
        username:   initial.username   ?? '',
        first_name: initial.first_name ?? '',
        last_name:  initial.last_name  ?? '',
        email:      initial.email      ?? '',
        phone:      initial.phone      ?? '',
        role:       initial.role       ?? '',
        password:   '',
        is_active:  initial.is_active  ?? true,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [initial])

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    // En edición, solo enviar password si se escribió algo
    if (isEdit && !payload.password) delete payload.password
    onSubmit(payload)
  }

  const apiError = error?.response?.data
  const errorMessage = apiError
    ? Object.values(apiError).flat().join(' ')
    : error?.message

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="u-first">Nombre <span className="text-destructive">*</span></Label>
          <Input id="u-first" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-last">Apellido</Label>
          <Input id="u-last" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="u-username">Usuario <span className="text-destructive">*</span></Label>
        <Input
          id="u-username"
          value={form.username}
          onChange={(e) => set('username', e.target.value)}
          required
          disabled={isEdit}
          className={isEdit ? 'opacity-60' : ''}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="u-role">Rol <span className="text-destructive">*</span></Label>
        <Select value={form.role} onValueChange={(v) => set('role', v)} required>
          <SelectTrigger id="u-role">
            <SelectValue placeholder="Seleccionar rol…" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="u-email">Correo</Label>
          <Input id="u-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-phone">Teléfono</Label>
          <Input id="u-phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="u-password">
          {isEdit ? 'Nueva contraseña' : 'Contraseña'}
          {!isEdit && <span className="text-destructive"> *</span>}
          {isEdit && <span className="text-muted-foreground font-normal"> (dejar en blanco para no cambiar)</span>}
        </Label>
        <Input
          id="u-password"
          type="password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          required={!isEdit}
          minLength={8}
          placeholder={isEdit ? '••••••••' : ''}
        />
      </div>

      {isEdit && (
        <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <div>
            <p className="text-sm font-medium">Usuario activo</p>
            <p className="text-xs text-muted-foreground">Los usuarios inactivos no pueden iniciar sesión</p>
          </div>
        </label>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading || !form.first_name || !form.username || !form.role} className="min-w-24">
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

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () => usersApi.list(debouncedSearch).then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (form) =>
      editing ? usersApi.update(editing.id, form) : usersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      setEditing(null)
    },
  })

  function openCreate() { setEditing(null); setOpen(true) }
  function openEdit(user) { setEditing(user); setOpen(true) }
  function handleClose() { setOpen(false); setEditing(null); saveMutation.reset() }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? '…' : `${users.length} usuario${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nombre o usuario…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Nombre</TableHead>
                <TableHead className="font-semibold text-foreground">Usuario</TableHead>
                <TableHead className="font-semibold text-foreground">Rol</TableHead>
                <TableHead className="font-semibold text-foreground">Contacto</TableHead>
                <TableHead className="font-semibold text-foreground">Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium text-muted-foreground">
                        {debouncedSearch ? 'Sin resultados para esa búsqueda' : 'No hay usuarios registrados'}
                      </p>
                      {!debouncedSearch && (
                        <Button variant="outline" size="sm" onClick={openCreate} className="mt-1 gap-2">
                          <UserPlus className="h-4 w-4" />
                          Agregar el primero
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="group">
                    <TableCell className="font-medium">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {u.username}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                        {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.phone || u.email || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'} className="text-xs">
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(u)}
                        className="gap-1.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>
          <UserForm
            initial={editing}
            onSubmit={(form) => saveMutation.mutate(form)}
            onCancel={handleClose}
            loading={saveMutation.isPending}
            error={saveMutation.error}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
