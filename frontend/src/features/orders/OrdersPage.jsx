import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ordersApi } from "@/api/orders";
import { useAuth } from "@/features/auth/AuthContext";
import OrderForm from "./OrderForm";
import StatusBadge from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ClipboardList, Search, Plus, ChevronRight } from "lucide-react";

const ACTIVE_STATUSES = new Set([
  "INGRESADO",
  "EN_REVISION",
  "REVISADO",
  "EN_ESPERA_MARCA",
  "NEGACION_GARANTIA",
  "COTIZADO",
  "EN_ESPERA_ABONO",
  "EN_ESPERA_REPUESTOS",
  "REPUESTOS_EN_TALLER",
  "EN_REPARACION",
  "LISTO_PARA_ENTREGAR",
]);

const QUICK_FILTERS = [
  { key: "activas", label: "Activas" },
  { key: "LISTO_PARA_ENTREGAR", label: "Para entregar" },
  { key: "EN_REPARACION", label: "En reparación" },
  { key: "EN_REVISION", label: "En revisión" },
  { key: "ENTREGADO", label: "Entregadas" },
  { key: "todas", label: "Todas" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(
    new Date(iso),
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canCreate = user?.role !== "TECNICO";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("activas");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const apiParams = {};
  if (debouncedSearch) apiParams.search = debouncedSearch;
  if (filter !== "activas" && filter !== "todas") apiParams.status = filter;

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ["orders", apiParams],
    queryFn: () => ordersApi.list(apiParams).then((r) => r.data),
  });

  const orders =
    filter === "activas"
      ? allOrders.filter((o) => ACTIVE_STATUSES.has(o.status))
      : allOrders;

  const createMutation = useMutation({
    mutationFn: (form) => ordersApi.create(form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
      navigate(`/orders/${res.data.id}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Órdenes de trabajo
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "…"
                : `${orders.length} OT${orders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva OT
          </Button>
        )}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cliente o N° OT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground w-28">
                  OT
                </TableHead>
                <TableHead className="font-semibold text-foreground max-[450px]:hidden">
                  Cliente
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Equipo
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Estado
                </TableHead>
                <TableHead className="font-semibold text-foreground max-[600px]:hidden">
                  Fecha
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium text-muted-foreground">
                        {debouncedSearch
                          ? "Sin resultados para esa búsqueda"
                          : "No hay órdenes en este filtro"}
                      </p>
                      {filter === "activas" && !debouncedSearch && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOpen(true)}
                          className="mt-1 gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Crear primera OT
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <TableCell>
                      <span
                        className={`font-mono text-sm ${order.service_type === "GARANTIA" ? "font-bold" : "font-medium"}`}
                      >
                        {order.display_number}
                      </span>
                    </TableCell>
                    <TableCell className="max-[450px]:hidden">
                      <div>
                        <span className="font-medium text-sm">
                          {order.client_name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {order.client_phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <div className="truncate font-medium text-sm">
                        {order.equipment_product_type || "—"}
                      </div>
                      <div className="flex">
                        {order.equipment_brand && (
                          <div className="truncate text-xs text-muted-foreground">
                            {order.equipment_brand}
                          </div>
                        )}
                        {order.equipment_model && (
                          <div className="truncate text-xs text-muted-foreground ml-1">
                            {order.equipment_model}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap max-[600px]:hidden">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva orden de trabajo</DialogTitle>
          </DialogHeader>
          <OrderForm
            onSubmit={(form) => createMutation.mutate(form)}
            onCancel={() => setOpen(false)}
            loading={createMutation.isPending}
            error={createMutation.error}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
