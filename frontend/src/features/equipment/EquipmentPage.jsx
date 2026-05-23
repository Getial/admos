import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { brandsApi, equipmentApi } from '@/api/equipment'
import BrandForm from './BrandForm'
import EquipmentForm from './EquipmentForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Wrench, Tag, Search, Plus, Pencil, ShieldCheck } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import { formatCost as _formatCost } from '@/lib/format'

function formatCost(value) {
  if (value == null) return <span className="text-muted-foreground/40">—</span>
  return _formatCost(value)
}

/* ─── Equipos tab ─────────────────────────────────────────── */
function EquipmentTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', debouncedSearch],
    queryFn: () => equipmentApi.list(debouncedSearch).then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (form) =>
      editing ? equipmentApi.update(editing.id, form) : equipmentApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      setOpen(false)
      setEditing(null)
      toast.success(editing ? 'Equipo actualizado' : 'Equipo creado')
    },
  })

  function openCreate() { setEditing(null); setOpen(true) }
  function openEdit(item) { setEditing(item); setOpen(true) }
  function handleClose() { setOpen(false); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? '…' : `${equipment.length} equipo${equipment.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Marca, modelo o serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full sm:w-56"
            />
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Nuevo equipo</span>
            <span className="xs:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Marca / Modelo</TableHead>
                <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                <TableHead className="font-semibold text-foreground hidden sm:table-cell">Categoría</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Costo revisión</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Mano de obra</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : equipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Wrench className="h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium text-muted-foreground">
                        {debouncedSearch ? 'Sin resultados para esa búsqueda' : 'Aún no hay equipos registrados'}
                      </p>
                      {!debouncedSearch && (
                        <Button variant="outline" size="sm" onClick={openCreate} className="mt-1 gap-2">
                          <Plus className="h-4 w-4" />
                          Agregar el primero
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                equipment.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {item.brand_detail?.name ?? <span className="text-muted-foreground">Sin marca</span>}
                        </span>
                        {item.model && (
                          <span className="text-muted-foreground"> · {item.model}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.product_type || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="font-normal text-xs whitespace-nowrap">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums hidden md:table-cell">{formatCost(item.default_revision_cost)}</TableCell>
                    <TableCell className="tabular-nums hidden md:table-cell">{formatCost(item.default_labor_cost)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        className="gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
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

/* ─── Marcas tab ──────────────────────────────────────────── */
function BrandsTab() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list().then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (form) =>
      editing ? brandsApi.update(editing.id, form) : brandsApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      setOpen(false)
      setEditing(null)
      toast.success(editing ? 'Marca actualizada' : 'Marca creada')
    },
  })

  function openCreate() { setEditing(null); setOpen(true) }
  function openEdit(brand) { setEditing(brand); setOpen(true) }
  function handleClose() { setOpen(false); setEditing(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? '…' : `${brands.length} marca${brands.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva marca
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-foreground">Nombre</TableHead>
              <TableHead className="font-semibold text-foreground">Autorizado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Tag className="h-10 w-10 text-muted-foreground/40" />
                    <p className="font-medium text-muted-foreground">Aún no hay marcas registradas</p>
                    <Button variant="outline" size="sm" onClick={openCreate} className="mt-1 gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar la primera
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id} className="group">
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>
                    {brand.is_authorized ? (
                      <Badge className="gap-1 bg-accent/15 text-accent hover:bg-accent/20 border-0 font-normal">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Autorizado
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(brand)}
                      className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
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

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar marca' : 'Nueva marca'}</DialogTitle>
          </DialogHeader>
          <BrandForm
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

/* ─── Page ────────────────────────────────────────────────── */
export default function EquipmentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Equipos</h1>
      </div>

      <Tabs defaultValue="equipment">
        <TabsList>
          <TabsTrigger value="equipment" className="gap-2">
            <Wrench className="h-4 w-4" />
            Equipos
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Tag className="h-4 w-4" />
            Marcas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="brands" className="mt-4">
          <BrandsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
