import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { useAuth } from "@/features/auth/AuthContext";
import StatusBadge from "./StatusBadge";
import TransitionDialog from "./TransitionDialog";
import PhotoAnnotator from "./PhotoAnnotator";
import EditOrderDialog from "./EditOrderDialog";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatCost } from "@/lib/format";
import { getApiError } from "@/lib/apiError";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  RefreshCw,
  User,
  Wrench,
  DollarSign,
  FileText,
  CheckCircle2,
  Package,
  Trash2,
  Plus,
  Pencil,
  MessageCircle,
  Camera,
  Receipt,
  Download,
  Copy,
  Check,
  Printer,
} from "lucide-react";


function buildWhatsAppUrl(order) {
  const phone = `57${order.client_detail?.phone?.replace(/\D/g, "")}`;
  const name = order.client_detail?.name ?? "cliente";
  const equipo = [
    order.equipment_detail?.brand_name,
    order.equipment_detail?.product_type,
  ]
    .filter(Boolean)
    .join(" ");
  const ot = order.display_number;

  const messages = {
    INGRESADO: `Hola ${name}, confirmamos que recibimos su ${equipo} en nuestro taller. Su número de orden es *${ot}*. Pronto iniciamos la revisión.`,
    EN_REVISION: `Hola ${name}, su ${equipo} (OT *${ot}*) está siendo revisado por nuestro técnico. En breve le informamos el diagnóstico.`,
    REVISADO: `Hola ${name}, ya revisamos su ${equipo} (OT *${ot}*). En breve le enviamos el presupuesto de reparación.`,
    COTIZADO: `Hola ${name}, le enviamos el presupuesto para reparar su ${equipo} (OT *${ot}*). Por favor confírmenos si desea proceder.`,
    EN_ESPERA_ABONO: `Hola ${name}, estamos esperando el abono para continuar con la reparación de su ${equipo} (OT *${ot}*).`,
    EN_ESPERA_REPUESTOS: `Hola ${name}, hemos pedido los repuestos para su ${equipo} (OT *${ot}*). Le avisamos cuando lleguen.`,
    REPUESTOS_EN_TALLER: `Hola ${name}, ya llegaron los repuestos para su ${equipo} (OT *${ot}*). Iniciamos la reparación en breve.`,
    EN_REPARACION: `Hola ${name}, su ${equipo} (OT *${ot}*) está en proceso de reparación. Le avisamos cuando esté listo.`,
    LISTO_PARA_ENTREGAR: `Hola ${name}, ¡buenas noticias! Su ${equipo} (OT *${ot}*) está listo para retirar. Puede pasar por el taller en nuestro horario de atención.`,
    ENTREGADO: `Hola ${name}, gracias por confiar en nosotros. Esperamos que su ${equipo} esté funcionando perfectamente. ¡Que tenga un buen día!`,
    EN_ESPERA_MARCA: `Hola ${name}, el diagnóstico de su ${equipo} (OT *${ot}*) está listo. Estamos esperando respuesta de la marca para el proceso de garantía.`,
    NEGACION_GARANTIA: `Hola ${name}, lamentablemente la marca no aprobó la garantía para su ${equipo} (OT *${ot}*). Le enviamos el presupuesto de reparación por cuenta propia.`,
  };

  const text =
    messages[order.status] ??
    `Hola ${name}, le contactamos sobre su ${equipo} (OT *${ot}*).`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}


function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-6">{children}</div>
    </div>
  );
}

function Timeline({ history }) {
  return (
    <div className="relative space-y-0">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        return (
          <div key={entry.id} className="relative flex gap-3 pb-4">
            {!isLast && (
              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
            )}
            <div
              className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                isLast
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40 bg-background"
              }`}
            />
            <div className="flex-1 min-w-0">
              <StatusBadge status={entry.to_status} />
              {entry.notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.notes}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground/60">
                {entry.changed_by_name} · {formatDate(entry.changed_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const EMPTY_PART = { description: "", quantity: 1, unit_price: "" };
const EMPTY_PAYMENT = { amount: "", notes: "" };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: order,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id).then((r) => r.data),
  });

  const transitionMutation = useMutation({
    mutationFn: (data) => ordersApi.transition(id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setTransitionOpen(false);
      toast.success("Estado actualizado");
    },
  });

  const [patchError, setPatchError] = useState(null);
  const patchMutation = useMutation({
    mutationFn: (data) => ordersApi.update(id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      setPatchError(null);
      toast.success("Cambios guardados");
    },
    onError: (err) => setPatchError(getApiError(err) ?? "No se pudo guardar"),
  });

  const addPartMutation = useMutation({
    mutationFn: (data) => ordersApi.addSparePart(id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      setNewPart(EMPTY_PART);
      toast.success("Repuesto agregado");
    },
  });

  const updatePartMutation = useMutation({
    mutationFn: ({ partId, data }) =>
      ordersApi.updateSparePart(id, partId, data),
    onSuccess: (res) => queryClient.setQueryData(["order", id], res.data),
  });

  const removePartMutation = useMutation({
    mutationFn: (partId) => ordersApi.removeSparePart(id, partId),
    onSuccess: (res) => queryClient.setQueryData(["order", id], res.data),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (data) => ordersApi.addPayment(id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      setNewPayment(EMPTY_PAYMENT);
      toast.success("Abono registrado");
    },
  });

  const removePaymentMutation = useMutation({
    mutationFn: (paymentId) => ordersApi.removePayment(id, paymentId),
    onSuccess: (res) => queryClient.setQueryData(["order", id], res.data),
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: ({ paymentId, file }) =>
      ordersApi.uploadReceipt(id, paymentId, file),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      toast.success("Recibo subido");
    },
  });

  const addPhotoMutation = useMutation({
    mutationFn: (file) => ordersApi.addPhoto(id, file),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      toast.success("Foto agregada");
    },
  });

  const removePhotoMutation = useMutation({
    mutationFn: (photoId) => ordersApi.removePhoto(id, photoId),
    onSuccess: (res) => queryClient.setQueryData(["order", id], res.data),
  });

  const addAnnotationMutation = useMutation({
    mutationFn: (file) => ordersApi.addPhoto(id, file, "Anotación"),
    onSuccess: (res) => {
      queryClient.setQueryData(["order", id], res.data);
      setAnnotatingPhoto(null);
      toast.success("Anotación guardada");
    },
  });

  const [newPart, setNewPart] = useState(EMPTY_PART);
  const [newPayment, setNewPayment] = useState(EMPTY_PAYMENT);
  const [editingLabor, setEditingLabor] = useState(false);
  const [laborInput, setLaborInput] = useState("");
  const [editingClientLabor, setEditingClientLabor] = useState(false);
  const [clientLaborInput, setClientLaborInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">No se pudo cargar la OT.</p>
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Volver
        </Button>
      </div>
    );
  }

  const canTransition = order.valid_transitions.length > 0;
  const isGarantia = order.service_type === "GARANTIA";

  const STATUSES_REQUIRE_PRICE = new Set([
    "COTIZADO",
    "EN_ESPERA_ABONO",
    "EN_ESPERA_REPUESTOS",
    "REPUESTOS_EN_TALLER",
    "EN_REPARACION",
    "LISTO_PARA_ENTREGAR",
    "ENTREGADO",
  ]);
  const showPartPrice = !isGarantia || order.status === "NEGACION_GARANTIA";
  const requirePartPrice =
    !isGarantia && STATUSES_REQUIRE_PRICE.has(order.status);

  const diagnosticEntry = order.status_history?.find(
    (h) => h.to_status === "REVISADO" && h.notes?.trim(),
  );
  const diagnosticText = diagnosticEntry?.notes ?? "";

  async function downloadAllPhotos() {
    for (const photo of order.diagnostic_photos ?? []) {
      const res = await fetch(photo.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.caption || `foto-diagnostico-${photo.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function copyDiagnostic() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(diagnosticText).catch(() => copyFallback());
    } else {
      copyFallback();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyFallback() {
    const el = document.createElement("textarea");
    el.value = diagnosticText;
    el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 max-[500px]:flex-col">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/orders")}
            className="-ml-2 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Órdenes
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                OT {order.display_number}
              </h1>
              <StatusBadge status={order.status} />
              <Badge
                variant={isGarantia ? "secondary" : "outline"}
                className="text-xs"
              >
                {isGarantia ? "Garantía" : "Al cobro"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Creado el {formatDate(order.created_at)} · por{" "}
              {order.created_by_name}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 max-[500px]:w-full flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/orders/${id}/print`)}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          {user?.role === "JEFE_TALLER" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Editar datos
            </Button>
          )}
          {canTransition && (
            <Button
              onClick={() => setTransitionOpen(true)}
              className="gap-2 max-[500px]:w-full"
            >
              <RefreshCw className="h-4 w-4" />
              Cambiar estado
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: detail */}
        <div className="lg:col-span-2 space-y-5 rounded-xl border bg-card p-6 shadow-sm">
          <Section icon={User} title="Cliente">
            <InfoRow label="Nombre" value={order.client_detail?.name} />
            <InfoRow
              label="Documento"
              value={`${order.client_detail?.document_type} ${order.client_detail?.document_number}`}
            />
            <InfoRow
              label="Teléfono"
              value={
                order.client_detail?.phone ? (
                  <span className="flex items-center gap-2 max-[450px]:flex-col max-[450px]:items-start">
                    {order.client_detail.phone}
                    <a
                      href={buildWhatsAppUrl(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </span>
                ) : null
              }
            />
            <InfoRow label="Dirección" value={order.client_detail?.address} />
          </Section>

          <Separator />

          <Section icon={Wrench} title="Equipo">
            <InfoRow
              label="Tipo de producto"
              value={order.equipment_detail?.product_type}
            />
            <InfoRow
              label="Marca / Modelo"
              value={[
                order.equipment_detail?.brand_name,
                order.equipment_detail?.model,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <InfoRow
              label="Categoría"
              value={CATEGORY_LABELS[order.equipment_detail?.category]}
            />
            <InfoRow label="N° de serie" value={order.serial_number} />
            {isGarantia && (
              <>
                <InfoRow
                  label="Marca garantía"
                  value={order.warranty_brand_name}
                />
                <InfoRow label="N° OT marca" value={order.brand_ot_number} />
              </>
            )}
          </Section>

          <Separator />

          <Section icon={FileText} title="Descripción">
            <div className="col-span-2 flex flex-col gap-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Problema reportado
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {order.problem_description}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado de recepción
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {order.received_condition}
                </p>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Diagnóstico y evidencias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Diagnóstico y evidencias
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {diagnosticText && (
                  <button
                    type="button"
                    onClick={copyDiagnostic}
                    title="Copiar diagnóstico"
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copiado" : "Copiar diagnóstico"}
                  </button>
                )}
                {(order.diagnostic_photos?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={downloadAllPhotos}
                    title="Descargar todas las fotos"
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar fotos
                  </button>
                )}
              </div>
            </div>

            {/* Texto del diagnóstico */}
            {diagnosticText ? (
              <p className="pl-6 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {diagnosticText}
              </p>
            ) : (
              <p className="pl-6 text-sm text-muted-foreground italic">
                Sin diagnóstico registrado.
              </p>
            )}

            {/* Fotos */}
            <div className="pl-6 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {order.diagnostic_photos?.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={photo.image_url}
                    alt={photo.caption || "Foto diagnóstico"}
                    className="w-full h-full object-cover"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-1.5 py-1 truncate">
                      {photo.caption}
                    </div>
                  )}
                  {order.status !== "ENTREGADO" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAnnotatingPhoto(photo)}
                        className="absolute top-1 left-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-75 transition-opacity hover:bg-black/70"
                        title="Anotar"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhotoMutation.mutate(photo.id)}
                        disabled={removePhotoMutation.isPending}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-75 transition-opacity hover:bg-black/70 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {order.status !== "ENTREGADO" && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={addPhotoMutation.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) addPhotoMutation.mutate(file);
                      e.target.value = "";
                    }}
                  />
                  {addPhotoMutation.isPending ? (
                    <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>

            {!order.diagnostic_photos?.length &&
              order.status === "ENTREGADO" && (
                <p className="pl-6 text-sm text-muted-foreground">
                  Sin fotos registradas.
                </p>
              )}
          </div>

          <Separator />

          <Section icon={Wrench} title="Técnicos encargados">
            <InfoRow
              label="Técnico revisión"
              value={order.reviewing_technician_name}
            />
            <InfoRow
              label="Técnico reparación"
              value={order.repair_technician_name}
            />
            {order.delivered_at && (
              <InfoRow
                label="Fecha entrega"
                value={formatDate(order.delivered_at)}
              />
            )}
          </Section>

          <Separator />

          {/* Repuestos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Repuestos
              </h3>
            </div>

            {order.spare_parts?.length > 0 ? (
              <div className="pl-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left pb-2 font-medium">
                        Descripción
                      </th>
                      <th className="text-right pb-2 font-medium w-12">
                        Cant.
                      </th>
                      <th className="text-right pb-2 font-medium w-28">
                        P. Unit.
                      </th>
                      <th className="text-right pb-2 font-medium w-28">
                        Subtotal
                      </th>
                      {isGarantia && (
                        <th className="text-center pb-2 font-medium w-24">
                          Cargo cliente
                        </th>
                      )}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {order.spare_parts.map((part) => (
                      <tr
                        key={part.id}
                        className={`border-b border-border/50 last:border-0 ${isGarantia && part.client_pays ? "bg-orange-50/50 dark:bg-orange-950/20" : ""}`}
                      >
                        <td className="py-2 pr-4">{part.description}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {part.quantity}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCost(part.unit_price)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCost(part.subtotal)}
                        </td>
                        {isGarantia && (
                          <td className="py-2 text-center">
                            <input
                              type="checkbox"
                              checked={part.client_pays}
                              disabled={
                                order.status === "ENTREGADO" ||
                                updatePartMutation.isPending
                              }
                              onChange={() =>
                                updatePartMutation.mutate({
                                  partId: part.id,
                                  data: { client_pays: !part.client_pays },
                                })
                              }
                              className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-default disabled:opacity-50"
                            />
                          </td>
                        )}
                        <td className="py-2 text-right">
                          {order.status !== "ENTREGADO" && (
                            <button
                              type="button"
                              onClick={() => removePartMutation.mutate(part.id)}
                              disabled={removePartMutation.isPending}
                              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="pl-6 text-sm text-muted-foreground">
                Sin repuestos registrados.
              </p>
            )}

            {/* Formulario agregar */}
            {order.status !== "ENTREGADO" && (
              <form
                className="pl-6 flex gap-2 items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPart.description) return;
                  if (requirePartPrice && !newPart.unit_price) return;
                  addPartMutation.mutate({
                    description: newPart.description,
                    quantity: Number(newPart.quantity),
                    unit_price:
                      newPart.unit_price !== "" ? newPart.unit_price : null,
                  });
                }}
              >
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Descripción
                  </label>
                  <Input
                    value={newPart.description}
                    onChange={(e) =>
                      setNewPart((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Ej: Escobilla 6mm"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="w-16 space-y-1">
                  <label className="text-xs text-muted-foreground">Cant.</label>
                  <Input
                    type="number"
                    min="1"
                    value={newPart.quantity}
                    onChange={(e) =>
                      setNewPart((p) => ({ ...p, quantity: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                {showPartPrice && (
                  <div className="w-28 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Precio unit.
                      {requirePartPrice ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-muted-foreground/60">
                          {" "}
                          (opc.)
                        </span>
                      )}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={newPart.unit_price}
                      onChange={(e) =>
                        setNewPart((p) => ({
                          ...p,
                          unit_price: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={
                    !newPart.description ||
                    (requirePartPrice && !newPart.unit_price) ||
                    addPartMutation.isPending
                  }
                  className="h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </Button>
              </form>
            )}
          </div>

          <Separator />

          {/* Resumen de costos */}
          <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isGarantia ? "Cargo al cliente" : "Resumen"}
                </h3>
              </div>

              {!isGarantia && order.revision_cost != null && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Costo revisión</span>
                  <span className="flex items-center gap-2">
                    {formatCost(order.revision_cost)}
                    <button
                      type="button"
                      onClick={() =>
                        patchMutation.mutate({
                          revision_paid: !order.revision_paid,
                        })
                      }
                      disabled={patchMutation.isPending}
                      className={`text-xs font-medium px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-70 disabled:opacity-50 cursor-pointer ${order.revision_paid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}
                    >
                      {order.revision_paid ? "Pagado" : "Pendiente"}
                    </button>
                  </span>
                </div>
              )}

              {isGarantia ? (
                <>
                  {/* Mano de obra pagada por la marca */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Mano de obra (marca)
                    </span>
                    {editingLabor ? (
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        autoFocus
                        value={laborInput}
                        onChange={(e) => setLaborInput(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(laborInput);
                          if (!isNaN(v) && v >= 0)
                            patchMutation.mutate({ labor_cost: v });
                          setEditingLabor(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.target.blur();
                          if (e.key === "Escape") setEditingLabor(false);
                        }}
                        className="h-7 w-32 text-right text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={order.status === "ENTREGADO"}
                        onClick={() => {
                          setLaborInput(order.labor_cost ?? "");
                          setEditingLabor(true);
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors group disabled:pointer-events-none"
                      >
                        {order.labor_cost ? (
                          formatCost(order.labor_cost)
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Sin valor
                          </span>
                        )}
                        {order.status !== "ENTREGADO" && (
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Mano de obra a cargo del cliente */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Mano de obra (cliente)
                    </span>
                    {editingClientLabor ? (
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        autoFocus
                        value={clientLaborInput}
                        onChange={(e) => setClientLaborInput(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(clientLaborInput);
                          patchMutation.mutate({
                            client_labor_cost: !isNaN(v) && v > 0 ? v : null,
                          });
                          setEditingClientLabor(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.target.blur();
                          if (e.key === "Escape") setEditingClientLabor(false);
                        }}
                        className="h-7 w-32 text-right text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={order.status === "ENTREGADO"}
                        onClick={() => {
                          setClientLaborInput(order.client_labor_cost ?? "");
                          setEditingClientLabor(true);
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors group disabled:pointer-events-none"
                      >
                        {order.client_labor_cost ? (
                          formatCost(order.client_labor_cost)
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Sin cargo
                          </span>
                        )}
                        {order.status !== "ENTREGADO" && (
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Repuestos cargo cliente */}
                  {order.spare_parts?.some(
                    (p) => p.client_pays && p.unit_price != null,
                  ) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Repuestos (cliente)
                      </span>
                      <span>
                        {formatCost(
                          order.spare_parts
                            .filter(
                              (p) => p.client_pays && p.unit_price != null,
                            )
                            .reduce(
                              (acc, p) =>
                                acc + p.quantity * Number(p.unit_price),
                              0,
                            ),
                        )}
                      </span>
                    </div>
                  )}
                </>
              ) : order.was_repaired === false ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mano de obra</span>
                  <span className="text-muted-foreground italic text-xs self-center">
                    No aplica — sin reparación
                  </span>
                </div>
              ) : (
                <>
                  {/* Mano de obra COBRO — editable inline */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mano de obra</span>
                    {editingLabor ? (
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        autoFocus
                        value={laborInput}
                        onChange={(e) => setLaborInput(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(laborInput);
                          if (!isNaN(v) && v >= 0)
                            patchMutation.mutate({ labor_cost: v });
                          setEditingLabor(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.target.blur();
                          if (e.key === "Escape") setEditingLabor(false);
                        }}
                        className="h-7 w-32 text-right text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLaborInput(order.labor_cost ?? "");
                          setEditingLabor(true);
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors group"
                      >
                        {formatCost(order.labor_cost)}
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>

                  {Number(order.spare_parts_total) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repuestos</span>
                      <span>{formatCost(order.spare_parts_total)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Total a cobrar</span>
                <span>{formatCost(order.final_price)}</span>
              </div>

              {!isGarantia &&
                order.revision_paid &&
                Number(order.revision_cost) > 0 && (
                  <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                    <span>− Revisión ya pagada</span>
                    <span>{formatCost(order.revision_cost)}</span>
                  </div>
                )}

              {Number(order.payments_total) > 0 && (
                <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                  <span>− Abonos recibidos</span>
                  <span>{formatCost(order.payments_total)}</span>
                </div>
              )}

              <div
                className={`flex justify-between items-center pt-2 border-t text-sm font-bold ${Number(order.saldo) === 0 ? "text-green-700 dark:text-green-400" : ""}`}
              >
                <span>Saldo pendiente</span>
                <span>{formatCost(order.saldo)}</span>
              </div>

              {patchError && (
                <p className="text-xs text-destructive">{patchError}</p>
              )}
            </div>

          {(!isGarantia ||
            Number(order.final_price) > 0 ||
            order.payments?.length > 0) && <Separator />}

          {/* Pagos / Abonos — oculto en GARANTIA sin cargos al cliente */}
          {(!isGarantia ||
            Number(order.final_price) > 0 ||
            order.payments?.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Pagos y abonos
                </h3>
              </div>

              {order.payments?.length > 0 ? (
                <div className="pl-6 space-y-1.5">
                  {order.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="font-medium w-28 shrink-0">
                        {formatCost(payment.amount)}
                      </span>
                      <span className="flex-1 text-muted-foreground truncate">
                        {payment.notes || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(payment.created_at)}
                      </span>
                      {payment.receipt_url ? (
                        <a
                          href={payment.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 transition-colors shrink-0"
                          title="Ver comprobante"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        order.status !== "ENTREGADO" && (
                          <label
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                            title="Adjuntar comprobante"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={uploadReceiptMutation.isPending}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  uploadReceiptMutation.mutate({
                                    paymentId: payment.id,
                                    file,
                                  });
                                e.target.value = "";
                              }}
                            />
                            <Receipt className="h-3.5 w-3.5" />
                          </label>
                        )
                      )}
                      {order.status !== "ENTREGADO" && (
                        <button
                          type="button"
                          onClick={() =>
                            removePaymentMutation.mutate(payment.id)
                          }
                          disabled={removePaymentMutation.isPending}
                          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pl-6 text-sm text-muted-foreground">
                  Sin pagos registrados.
                </p>
              )}

              {order.status !== "ENTREGADO" && (
                <form
                  className="pl-6 flex gap-2 items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newPayment.amount) return;
                    addPaymentMutation.mutate({
                      amount: newPayment.amount,
                      notes: newPayment.notes,
                    });
                  }}
                >
                  <div className="w-32 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Monto
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={newPayment.amount}
                      onChange={(e) =>
                        setNewPayment((p) => ({ ...p, amount: e.target.value }))
                      }
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Referencia (opcional)
                    </label>
                    <Input
                      value={newPayment.notes}
                      onChange={(e) =>
                        setNewPayment((p) => ({ ...p, notes: e.target.value }))
                      }
                      placeholder="Efectivo, transferencia…"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={
                      !newPayment.amount || addPaymentMutation.isPending
                    }
                    className="h-8 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Registrar
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Historial</h3>
          </div>
          {order.status_history.length > 0 ? (
            <Timeline history={order.status_history} />
          ) : (
            <p className="text-sm text-muted-foreground">Sin historial.</p>
          )}
        </div>
      </div>

      <EditOrderDialog
        order={order}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <TransitionDialog
        open={transitionOpen}
        onOpenChange={setTransitionOpen}
        order={order}
        onTransition={(data) => transitionMutation.mutate(data)}
        loading={transitionMutation.isPending}
        error={transitionMutation.error}
        onUpdatePart={(partId, data) =>
          updatePartMutation.mutate({ partId, data })
        }
        onRemovePart={(partId) => removePartMutation.mutate(partId)}
      />

      <PhotoAnnotator
        photo={annotatingPhoto}
        open={!!annotatingPhoto}
        onClose={() => setAnnotatingPhoto(null)}
        onSave={(file) => addAnnotationMutation.mutate(file)}
        saving={addAnnotationMutation.isPending}
      />
    </div>
  );
}
