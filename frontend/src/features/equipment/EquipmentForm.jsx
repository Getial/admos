import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandsApi } from "@/api/equipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

const CATEGORIES = [
  {
    group: "Herramientas",
    options: [
      {
        value: "HERRAMIENTA_ELECTRICA_CABLE",
        label: "Herramienta eléctrica con cable",
      },
      {
        value: "HERRAMIENTA_ELECTRICA_INALAMBRIC",
        label: "Herramienta eléctrica inalámbrica",
      },
      { value: "HERRAMIENTA_NEUMATICA", label: "Herramienta neumática" },
      { value: "HERRAMIENTA_HIDRAULICA", label: "Herramienta hidráulica" },
    ],
  },
  {
    group: "Motores",
    options: [
      { value: "MOTOR_ELECTRICO", label: "Motor eléctrico" },
      { value: "MOTOR_GASOLINA", label: "Motor a gasolina" },
      { value: "MOTOR_DIESEL", label: "Motor diésel" },
    ],
  },
  {
    group: "Generación eléctrica",
    options: [
      {
        value: "PLANTA_ELECTRICA_GASOLINA",
        label: "Planta eléctrica a gasolina",
      },
      { value: "PLANTA_ELECTRICA_DIESEL", label: "Planta eléctrica diésel" },
    ],
  },
  {
    group: "Soldadura y corte",
    options: [
      { value: "SOLDADOR_INVERSOR", label: "Soldador inversor" },
      { value: "SOLDADOR_CONVENCIONAL", label: "Soldador convencional" },
      { value: "MOTOSOLDADOR", label: "Motosoldador" },
      { value: "CORTADOR_PLASMA", label: "Cortador de plasma" },
      { value: "OXICORTE", label: "Equipo de oxicorte" },
    ],
  },
  {
    group: "Otros",
    options: [
      {
        value: "AGROFORESTAL",
        label: "Agroforestal (motosierra, guadaña, podadora)",
      },
      { value: "LINEA_BLANCA", label: "Línea blanca (electrodomésticos)" },
    ],
  },
];

const EMPTY = {
  brand: "",
  product_type: "",
  model: "",
  category: "",
  notes: "",
  default_revision_cost: "",
  default_labor_cost: "",
  brand_labor_price: "",
};

export default function EquipmentForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        brand: initial.brand ?? "",
        product_type: initial.product_type ?? "",
        default_revision_cost: initial.default_revision_cost ?? "",
        default_labor_cost: initial.default_labor_cost ?? "",
        brand_labor_price: initial.brand_labor_price ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [initial]);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsApi.list().then((r) => r.data),
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      brand: form.brand || null,
      default_revision_cost:
        form.default_revision_cost === "" ? null : form.default_revision_cost,
      default_labor_cost:
        form.default_labor_cost === "" ? null : form.default_labor_cost,
      brand_labor_price:
        form.brand_labor_price === "" ? null : form.brand_labor_price,
    };
    onSubmit(payload);
  }

  const apiError = error?.response?.data;
  const errorMessage = apiError
    ? Object.values(apiError).flat().join(" ")
    : error?.message;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="eq-brand">Marca</Label>
          <Select
            value={String(form.brand)}
            onValueChange={(v) => set("brand", v === "none" ? "" : v)}
          >
            <SelectTrigger id="eq-brand">
              <SelectValue placeholder="Sin marca">
                {form.brand
                  ? (brands.find((b) => String(b.id) === String(form.brand))
                      ?.name ?? null)
                  : "Sin marca"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin marca</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="eq-category">
            Categoría <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.category}
            onValueChange={(v) => set("category", v)}
          >
            <SelectTrigger id="eq-category">
              <SelectValue placeholder="Seleccionar…" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((g) => (
                <SelectGroup key={g.group}>
                  <SelectLabel>{g.group}</SelectLabel>
                  {g.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eq-product-type">Tipo de producto</Label>
        <Input
          id="eq-product-type"
          value={form.product_type}
          onChange={(e) => set("product_type", e.target.value)}
          placeholder="Ej: Taladro eléctrico, Sierra circular, Soldador MIG…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eq-model">Modelo / Referencia</Label>
        <Input
          id="eq-model"
          value={form.model}
          onChange={(e) => set("model", e.target.value)}
          placeholder="Ej: ID700, GBH 240"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="eq-revision">
            Costo revisión{" "}
            <span className="text-muted-foreground font-normal">
              (opcional)
            </span>
          </Label>
          <Input
            id="eq-revision"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.default_revision_cost}
            onChange={(e) => set("default_revision_cost", e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="eq-labor">
            Costo mano de obra{" "}
            <span className="text-muted-foreground font-normal">
              (opcional)
            </span>
          </Label>
          <Input
            id="eq-labor"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.default_labor_cost}
            onChange={(e) => set("default_labor_cost", e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="eq-brand-labor">
            M.O. garantía{" "}
            <span className="text-muted-foreground font-normal">
              (opcional)
            </span>
          </Label>
          <Input
            id="eq-brand-labor"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.brand_labor_price}
            onChange={(e) => set("brand_labor_price", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eq-notes">
          Notas{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Textarea
          id="eq-notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Observaciones generales del equipo"
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
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !form.category}
          className="min-w-24"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Guardando…
            </span>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </form>
  );
}
