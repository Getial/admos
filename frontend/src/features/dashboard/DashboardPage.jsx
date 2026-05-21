import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { dashboardApi, bonusTiersApi } from "@/api/dashboard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BarChart2, Award, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(value) {
  if (value == null) return "—";
  return `$${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function fmtDays(d) {
  if (d == null) return "—";
  return `${d} días`;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isoFirstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const CHART_COLORS = ["#2563EB", "#059669", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}


function ChartShell({ title, children, height = 260 }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-foreground mb-4">{title}</p>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function EmptyChart({ message = "Sin datos en el período seleccionado" }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── tabs ────────────────────────────────────────────────────────────────────

const TABS_CHIEF = [
  { key: "productivity", label: "Productividad" },
  { key: "equipment",    label: "Equipos y repuestos" },
  { key: "revenue",      label: "Ingresos" },
  { key: "times",        label: "Tiempos" },
  { key: "bonuses",      label: "Bonos" },
];

const TABS_TECH = [{ key: "productivity", label: "Mi productividad" }];

// ─── date range picker ───────────────────────────────────────────────────────

function DateRange({ start, end, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Desde</span>
      <input
        type="date"
        value={start}
        max={end}
        onChange={(e) => onChange(e.target.value, end)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <span className="text-xs text-muted-foreground">hasta</span>
      <input
        type="date"
        value={end}
        min={start}
        max={isoToday()}
        onChange={(e) => onChange(start, e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

// ─── Productividad ───────────────────────────────────────────────────────────

function ProductivityTab({ start, end, isChief }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "productivity", start, end],
    queryFn: () => dashboardApi.productivity(start, end).then((r) => r.data),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Cargando…</div>;

  const byTech = data?.by_technician ?? [];
  const daily  = data?.daily ?? [];
  const total  = byTech.reduce((s, t) => s + Number(t.labor), 0);
  const totalOts = byTech.reduce((s, t) => s + t.ots, 0);

  // Aggregate daily by date for the chart (all techs together for Jefe)
  const dailyMap = {};
  for (const d of daily) {
    if (!dailyMap[d.date]) dailyMap[d.date] = { date: d.date };
    if (isChief) {
      dailyMap[d.date][d.technician_name] = (dailyMap[d.date][d.technician_name] || 0) + Number(d.labor);
    } else {
      dailyMap[d.date].labor = (dailyMap[d.date].labor || 0) + Number(d.labor);
    }
  }
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  const techNames = [...new Set(daily.map((d) => d.technician_name))];

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${isChief ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        <StatCard label="MO total período" value={fmt(total)} />
        <StatCard label="OTs cerradas" value={totalOts} />
        {isChief && byTech.length > 0 && (
          <>
            <StatCard label="Técnico líder" value={byTech[0]?.name ?? "—"} sub={fmt(byTech[0]?.labor)} />
            <StatCard label="Promedio x técnico" value={fmt(byTech.length ? total / byTech.length : 0)} />
          </>
        )}
      </div>

      {isChief && byTech.length > 0 && (
        <ChartShell title="MO por técnico (período)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTech} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip formatter={(v) => fmt(v)} labelStyle={{ color: "var(--foreground)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="labor" fill="#2563EB" radius={[4, 4, 0, 0]} name="Mano de obra" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      )}

      {dailyData.length > 0 ? (
        <ChartShell title="MO diaria">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip formatter={(v) => fmt(v)} labelStyle={{ color: "var(--foreground)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {isChief
                ? techNames.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} dot={false} strokeWidth={2} />
                  ))
                : <Line type="monotone" dataKey="labor" stroke="#2563EB" dot={false} strokeWidth={2} name="Mano de obra" />
              }
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>
      ) : (
        <ChartShell title="MO diaria"><EmptyChart /></ChartShell>
      )}

      {isChief && byTech.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Técnico</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">OTs cerradas</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">MO acumulada</th>
              </tr>
            </thead>
            <tbody>
              {byTech.map((t) => (
                <tr key={t.technician_id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{t.ots}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(t.labor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Equipos y repuestos ──────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  HERRAMIENTA_ELECTRICA_CABLE: "H. eléctrica con cable",
  HERRAMIENTA_ELECTRICA_INALAMBRIC: "H. eléctrica inalámbrica",
  HERRAMIENTA_NEUMATICA: "H. neumática",
  HERRAMIENTA_HIDRAULICA: "H. hidráulica",
  MOTOR_ELECTRICO: "Motor eléctrico",
  MOTOR_GASOLINA: "Motor gasolina",
  MOTOR_DIESEL: "Motor diésel",
  PLANTA_ELECTRICA_GASOLINA: "Planta gasolina",
  PLANTA_ELECTRICA_DIESEL: "Planta diésel",
  SOLDADOR_INVERSOR: "Soldador inversor",
  SOLDADOR_CONVENCIONAL: "Soldador convencional",
  MOTOSOLDADOR: "Motosoldador",
  CORTADOR_PLASMA: "Cortador plasma",
  OXICORTE: "Oxicorte",
  AGROFORESTAL: "Agroforestal",
  LINEA_BLANCA: "Línea blanca",
};

function EquipmentTab({ start, end }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "equipment", start, end],
    queryFn: () => dashboardApi.equipment(start, end).then((r) => r.data),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Cargando…</div>;

  const topEquip  = data?.top_equipment ?? [];
  const topParts  = data?.top_spare_parts ?? [];
  const byCat     = (data?.by_category ?? []).map((c) => ({
    ...c,
    label: CATEGORY_LABELS[c.category] ?? c.category,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {topEquip.length > 0 ? (
          <ChartShell title="Equipos que más entran (Top 10)" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEquip.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="product_type" width={130} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} name="OTs" />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        ) : (
          <ChartShell title="Equipos que más entran" height={320}><EmptyChart /></ChartShell>
        )}

        {byCat.length > 0 ? (
          <ChartShell title="Distribución por categoría" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCat} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={110} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byCat.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartShell>
        ) : (
          <ChartShell title="Distribución por categoría" height={320}><EmptyChart /></ChartShell>
        )}
      </div>

      {topParts.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-medium text-foreground">Repuestos más usados</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">#</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Repuesto</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Cantidad total</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">En OTs</th>
              </tr>
            </thead>
            <tbody>
              {topParts.map((p, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5 text-foreground font-medium">{p.description}</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{p.total_qty}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{p.times_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Ingresos ─────────────────────────────────────────────────────────────────

function RevenueTab({ start, end }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "revenue", start, end],
    queryFn: () => dashboardApi.revenue(start, end).then((r) => r.data),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Cargando…</div>;

  const byType     = data?.by_service_type ?? {};
  const byBrand    = data?.warranty_by_brand ?? [];
  const byMonth    = data?.by_month ?? [];
  const cobro      = byType.COBRO    ?? { count: 0, total: 0 };
  const garantia   = byType.GARANTIA ?? { count: 0, total: 0 };
  const totalRev   = Number(cobro.total) + Number(garantia.total);

  const pieData = [
    { name: "Al cobro",   value: Number(cobro.total) },
    { name: "Garantía",   value: Number(garantia.total) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Ingresos totales" value={fmt(totalRev)} />
        <StatCard label="Al cobro" value={fmt(cobro.total)} sub={`${cobro.count} OTs`} />
        <StatCard label="Garantía" value={fmt(garantia.total)} sub={`${garantia.count} OTs`} />
        <StatCard label="Ticket promedio" value={fmt(totalRev / ((cobro.count + garantia.count) || 1))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pieData.length > 0 ? (
          <ChartShell title="Cobro vs Garantía">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#2563EB" />
                  <Cell fill="#059669" />
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartShell>
        ) : (
          <ChartShell title="Cobro vs Garantía"><EmptyChart /></ChartShell>
        )}

        {byBrand.length > 0 ? (
          <ChartShell title="Ingresos por marca (garantía)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBrand} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="brand" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        ) : (
          <ChartShell title="Ingresos por marca (garantía)"><EmptyChart message="Sin OTs de garantía en el período" /></ChartShell>
        )}
      </div>

      {byMonth.length > 0 && (
        <ChartShell title="Evolución mensual de ingresos" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="COBRO"    fill="#2563EB" radius={[4, 4, 0, 0]} name="Al cobro" stackId="a" />
              <Bar dataKey="GARANTIA" fill="#059669" radius={[4, 4, 0, 0]} name="Garantía"  stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      )}
    </div>
  );
}

// ─── Tiempos ──────────────────────────────────────────────────────────────────

function TimesTab({ start, end }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "repair-times", start, end],
    queryFn: () => dashboardApi.repairTimes(start, end).then((r) => r.data),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Cargando…</div>;

  const byCat = (data?.by_category ?? []).map((c) => ({
    ...c,
    label: CATEGORY_LABELS[c.category] ?? c.category,
  }));

  const compareData = [
    { name: `Con espera repuestos (${data?.count_with_parts_wait ?? 0} OTs)`,    dias: data?.avg_with_parts_wait },
    { name: `Sin espera repuestos (${data?.count_without_parts_wait ?? 0} OTs)`, dias: data?.avg_without_parts_wait },
  ].filter((d) => d.dias != null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="OTs analizadas"       value={data?.total_ots ?? "—"} />
        <StatCard label="Tiempo promedio total" value={fmtDays(data?.avg_total_days)} />
        <StatCard label="Con espera repuestos"  value={fmtDays(data?.avg_with_parts_wait)}    sub={`${data?.count_with_parts_wait ?? 0} OTs`} />
        <StatCard label="Sin espera repuestos"  value={fmtDays(data?.avg_without_parts_wait)} sub={`${data?.count_without_parts_wait ?? 0} OTs`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {compareData.length > 0 ? (
          <ChartShell title="Impacto de la espera de repuestos">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" unit=" días" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip formatter={(v) => `${v} días`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="dias" fill="#2563EB" radius={[0, 4, 4, 0]} name="Días promedio" />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        ) : (
          <ChartShell title="Impacto de la espera de repuestos"><EmptyChart /></ChartShell>
        )}

        {byCat.length > 0 ? (
          <ChartShell title="Tiempo promedio por categoría">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" unit=" días" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip formatter={(v) => `${v} días`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="avg_days" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Días promedio" />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        ) : (
          <ChartShell title="Tiempo promedio por categoría"><EmptyChart /></ChartShell>
        )}
      </div>
    </div>
  );
}

// ─── Bonos ───────────────────────────────────────────────────────────────────

function TierForm({ onSave, onCancel, initial = {} }) {
  const [threshold,   setThreshold]   = useState(initial.threshold   ?? "");
  const [bonusAmount, setBonusAmount] = useState(initial.bonus_amount ?? "");
  const [label,       setLabel]       = useState(initial.label        ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ threshold: Number(threshold), bonus_amount: Number(bonusAmount), label });
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Productividad mínima ($)</label>
        <input type="number" min="0" required value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputCls} placeholder="3000000" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Monto del bono ($)</label>
        <input type="number" min="0" required value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} className={inputCls} placeholder="150000" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Etiqueta (opcional)</label>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="Meta bronce" />
      </div>
      <div className="sm:col-span-3 flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>}
        <button type="submit" className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Guardar</button>
      </div>
    </form>
  );
}

function TechBonusCard({ tech }) {
  const [open, setOpen] = useState(false);
  const tier = tech.applicable_tier;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{tech.name}</p>
            <p className="text-xs text-muted-foreground">{tech.ots.length} OTs · Productividad: {fmt(tech.total_labor)}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {tier ? (
            <>
              <p className="text-lg font-semibold text-primary">{fmt(tech.bonus_amount)}</p>
              <p className="text-xs text-muted-foreground">{tier.label || `Meta $${Number(tier.threshold).toLocaleString("es-CO")}`}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin meta alcanzada</p>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-5 py-2 font-medium">OT</th>
                <th className="text-left px-3 py-2 font-medium">Equipo</th>
                <th className="text-left px-3 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-right px-5 py-2 font-medium">MO</th>
              </tr>
            </thead>
            <tbody>
              {tech.ots.map((ot, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-2 font-mono text-xs">{ot.ot_number}</td>
                  <td className="px-3 py-2 text-foreground">{ot.equipment}</td>
                  <td className="px-3 py-2 text-muted-foreground">{ot.client}</td>
                  <td className="px-3 py-2 text-muted-foreground">{ot.date}</td>
                  <td className="px-5 py-2 text-right font-medium">{fmt(ot.labor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={4} className="px-5 py-2 text-xs font-medium text-muted-foreground">Total</td>
                <td className="px-5 py-2 text-right font-semibold text-foreground">{fmt(tech.total_labor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function BonusTab({ start, end }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "bonuses", start, end],
    queryFn: () => dashboardApi.bonuses(start, end).then((r) => r.data),
  });

  const { data: tiersData, isLoading: tiersLoading } = useQuery({
    queryKey: ["bonus-tiers"],
    queryFn: () => bonusTiersApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: bonusTiersApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bonus-tiers"] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "bonuses"] }); setAdding(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => bonusTiersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bonus-tiers"] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "bonuses"] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: bonusTiersApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bonus-tiers"] }); queryClient.invalidateQueries({ queryKey: ["dashboard", "bonuses"] }); },
  });

  const tiers  = tiersData ?? [];
  const results = data?.results ?? [];

  return (
    <div className="space-y-8">

      {/* Configuración de tramos */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Tramos de bonos</h2>
          </div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Agregar tramo
            </button>
          )}
        </div>

        {!tiersLoading && tiers.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No hay tramos configurados. Agrega el primero.</p>
        )}

        {tiers.length > 0 && (
          <div className="space-y-2">
            {tiers.map((tier) => (
              editingId === tier.id ? (
                <div key={tier.id} className="rounded-lg border border-border p-4">
                  <TierForm
                    initial={tier}
                    onSave={(d) => updateMutation.mutate({ id: tier.id, data: d })}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div key={tier.id} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-medium text-foreground">≥ {fmt(tier.threshold)}</span>
                    <span className="text-primary font-semibold text-sm">{fmt(tier.bonus_amount)}</span>
                    {tier.label && <span className="text-xs text-muted-foreground truncate">{tier.label}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditingId(tier.id)} className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Editar</button>
                    <button onClick={() => deleteMutation.mutate(tier.id)} className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {adding && (
          <div className="rounded-lg border border-border p-4">
            <TierForm onSave={(d) => createMutation.mutate(d)} onCancel={() => setAdding(false)} />
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Bonos del período</h2>
        {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Cargando…</p>}
        {!isLoading && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin OTs reparadas en el período seleccionado.</p>
        )}
        {results.map((tech) => <TechBonusCard key={tech.technician_id} tech={tech} />)}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const isChief = user?.role === "JEFE_TALLER";
  const tabs = isChief ? TABS_CHIEF : TABS_TECH;

  const [activeTab, setActiveTab] = useState("productivity");
  const [start, setStart] = useState(isoFirstOfMonth);
  const [end,   setEnd]   = useState(isoToday);

  function handleRange(s, e) {
    setStart(s);
    setEnd(e);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Métricas del taller</p>
          </div>
        </div>
        <DateRange start={start} end={end} onChange={handleRange} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "productivity" && <ProductivityTab start={start} end={end} isChief={isChief} />}
      {activeTab === "equipment"    && <EquipmentTab    start={start} end={end} />}
      {activeTab === "revenue"      && <RevenueTab      start={start} end={end} />}
      {activeTab === "times"        && <TimesTab        start={start} end={end} />}
      {activeTab === "bonuses"      && <BonusTab        start={start} end={end} />}
    </div>
  );
}
