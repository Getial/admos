import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";
import { toast } from "sonner";
import ClientForm from "./ClientForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, UserPlus, Pencil } from "lucide-react";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  function handleSearch(e) {
    setSearch(e.target.value);
  }

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", debouncedSearch],
    queryFn: () => clientsApi.list(debouncedSearch).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (form) =>
      editing ? clientsApi.update(editing.id, form) : clientsApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Cliente actualizado" : "Cliente creado");
    },
  });

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "…"
                : `${clients.length} registrado${clients.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nombre, documento o teléfono..."
          value={search}
          onChange={handleSearch}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">
                  Nombre
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Documento
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Teléfono
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Dirección
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium text-muted-foreground">
                        {debouncedSearch
                          ? "Sin resultados para esa búsqueda"
                          : "Aún no hay clientes registrados"}
                      </p>
                      {!debouncedSearch && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openCreate}
                          className="mt-1 gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Agregar el primero
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {client.document_type}
                        </Badge>
                        <span className="font-mono text-sm">
                          {client.document_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {client.phone}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.address || (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(client)}
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
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
          </DialogHeader>
          <ClientForm
            initial={editing}
            onSubmit={(form) => saveMutation.mutate(form)}
            onCancel={handleClose}
            loading={saveMutation.isPending}
            error={saveMutation.error}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
