import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";

const CATEGORY_LABELS = {
  HERRAMIENTA_ELECTRICA_CABLE: "Herramienta eléctrica con cable",
  HERRAMIENTA_ELECTRICA_INALAMBRIC: "Herramienta eléctrica inalámbrica",
  HERRAMIENTA_NEUMATICA: "Herramienta neumática",
  HERRAMIENTA_HIDRAULICA: "Herramienta hidráulica",
  MOTOR_ELECTRICO: "Motor eléctrico",
  MOTOR_GASOLINA: "Motor a gasolina",
  MOTOR_DIESEL: "Motor diésel",
  PLANTA_ELECTRICA_GASOLINA: "Planta eléctrica a gasolina",
  PLANTA_ELECTRICA_DIESEL: "Planta eléctrica diésel",
  SOLDADOR_INVERSOR: "Soldador inversor",
  SOLDADOR_CONVENCIONAL: "Soldador convencional",
  MOTOSOLDADOR: "Motosoldador",
  CORTADOR_PLASMA: "Cortador de plasma",
  OXICORTE: "Equipo de oxicorte",
  AGROFORESTAL: "Agroforestal",
  LINEA_BLANCA: "Línea blanca",
};

function formatDateShort(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(new Date(iso));
}

function formatCost(value) {
  if (value == null || value === "" || Number(value) === 0) return null;
  return `$${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function Divider() {
  return <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 4, fontSize: 11, lineHeight: "16px" }}>
      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{label}:</span>
      <span style={{ wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function SignatureBlock({ label }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 14 }}>{label}</div>
      <div style={{ borderBottom: "1px solid #000", marginBottom: 3, width: "100%" }} />
      <div style={{ fontSize: 9, color: "#555" }}>Firma</div>
      <div style={{ marginTop: 8, borderBottom: "1px solid #000", marginBottom: 3, width: "60%" }} />
      <div style={{ fontSize: 9, color: "#555" }}>Nombre / Cédula</div>
      <div style={{ marginTop: 4, fontSize: 9 }}>Fecha: ___________________</div>
    </div>
  );
}

export default function OrderPrint() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id).then((r) => r.data),
  });

  useEffect(() => {
    if (order) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (isLoading) {
    return (
      <div style={{ padding: 16, fontFamily: "monospace", fontSize: 12 }}>
        Cargando OT...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: 16, fontFamily: "monospace", fontSize: 12 }}>
        No se pudo cargar la OT.{" "}
        <button onClick={() => navigate(-1)} style={{ textDecoration: "underline" }}>
          Volver
        </button>
      </div>
    );
  }

  const isGarantia = order.service_type === "GARANTIA";
  const equipo = order.equipment_detail;
  const cliente = order.client_detail;
  const precio = formatCost(order.final_price);

  const receiptStyle = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 11,
    lineHeight: "15px",
    color: "#000",
    background: "#fff",
    width: "72mm",
    padding: "4mm 2mm",
    margin: "0 auto",
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print { display: none !important; }
        }
        @media screen {
          body { background: #e5e7eb; }
        }
      `}</style>

      {/* Botón sólo en pantalla */}
      <div
        className="no-print"
        style={{
          textAlign: "center",
          padding: "12px",
          display: "flex",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Imprimir
        </button>
        <button
          onClick={() => navigate(`/orders/${id}`)}
          style={{
            padding: "8px 20px",
            background: "#fff",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Volver
        </button>
      </div>

      {/* Recibo */}
      <div style={receiptStyle}>
        {/* Encabezado */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            TALLER TESLA
          </div>
          <div style={{ fontSize: 10 }}>Electromecánica Industrial</div>
        </div>

        <Divider />

        {/* Datos de la OT */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            ORDEN DE TRABAJO
          </div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            N° {order.display_number}
          </div>
          <div style={{ fontSize: 10 }}>Fecha: {formatDateShort(order.created_at)}</div>
        </div>

        <Divider />

        {/* Cliente */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>CLIENTE</div>
          <Row label="Nombre" value={cliente?.name} />
          <Row
            label="Doc"
            value={
              cliente?.document_type && cliente?.document_number
                ? `${cliente.document_type} ${cliente.document_number}`
                : null
            }
          />
          <Row label="Tel" value={cliente?.phone} />
        </div>

        <Divider />

        {/* Equipo */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>EQUIPO</div>
          <Row
            label="Equipo"
            value={[equipo?.brand_name, equipo?.product_type].filter(Boolean).join(" ")}
          />
          {equipo?.model && <Row label="Modelo" value={equipo.model} />}
          {equipo?.category && (
            <Row label="Tipo" value={CATEGORY_LABELS[equipo.category] ?? equipo.category} />
          )}
          <Row label="Serial" value={order.serial_number} />
          {isGarantia && <Row label="Garantía" value={order.warranty_brand_name} />}
        </div>

        <Divider />

        {/* Problema */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
            FALLA REPORTADA
          </div>
          <div style={{ fontSize: 10, lineHeight: "14px", wordBreak: "break-word" }}>
            {order.problem_description || "—"}
          </div>
        </div>

        <Divider />

        {/* Tipo de servicio y precio estimado */}
        <div style={{ marginBottom: 4 }}>
          <Row label="Servicio" value={isGarantia ? "Garantía" : "Al cobro"} />
          {precio && <Row label="Valor aprox." value={precio} />}
        </div>

        <Divider />

        {/* Aviso */}
        <div style={{ fontSize: 9, textAlign: "center", margin: "4px 0 8px" }}>
          Recibido por el taller en las condiciones descritas.
        </div>

        {/* Firmas de recepción */}
        <SignatureBlock label="ENTREGA (CLIENTE)" />
        <SignatureBlock label="RECIBE (TALLER)" />

        <Divider />

        {/* Firma de retiro — separada visualmente */}
        <div
          style={{
            border: "1px dashed #000",
            padding: "6px 4px",
            marginTop: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>
            ✂ RETIRO DE EQUIPO
          </div>
          <div style={{ fontSize: 9, marginBottom: 6 }}>
            Presentar este comprobante al retirar.
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
            N° {order.display_number} · {cliente?.name}
          </div>
          <SignatureBlock label="FIRMA RETIRO (CLIENTE)" />
        </div>

        {/* Pie */}
        <div style={{ textAlign: "center", fontSize: 9, marginTop: 8 }}>
          Conserve este comprobante para retirar su equipo.
        </div>
      </div>
    </>
  );
}
