# Admos — Frontend

Interfaz web del sistema de gestión de órdenes de trabajo para **Taller Tesla**, taller de servicio técnico especializado en herramientas eléctricas, motores y equipos electromecánicos.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + Vite 8 |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui (Radix UI) |
| Íconos | Lucide React |
| Tipografía | Geist Variable |
| Routing | React Router v7 |
| Estado del servidor | TanStack Query v5 |
| HTTP | Axios |
| Deploy | Vercel |

## Requisitos

- Node.js 18+
- Backend de Admos corriendo (ver `/backend`)

## Desarrollo local

```bash
npm install
npm run dev
```

La app corre en `http://localhost:5173` por defecto.

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:8000/api
```

En producción esta variable apunta al backend desplegado en Render.

## Estructura

```
src/
├── api/              # Clientes HTTP por dominio (orders, clients, equipment…)
├── components/
│   └── ui/           # Componentes base de shadcn/ui
├── features/
│   ├── auth/         # Login y contexto de autenticación (JWT)
│   ├── clients/      # CRUD de clientes
│   ├── equipment/    # CRUD de equipos y marcas
│   └── orders/       # Órdenes de trabajo — módulo principal
├── hooks/            # Hooks reutilizables
├── lib/              # Utilidades (cn, etc.)
└── utils/            # Helpers generales
```

## Módulo de órdenes

El módulo central de la aplicación. Cubre el ciclo completo de una OT:

- **OrdersPage** — listado con filtros rápidos por estado y búsqueda
- **OrderDetail** — detalle completo: equipo, diagnóstico, repuestos, fotos, resumen de costos, pagos y historial de estados
- **OrderForm** — creación de OT con selección guiada de equipo (tipo → marca → modelo)
- **TransitionDialog** — cambio de estado con validaciones por tipo de servicio (garantía vs. cobro)
- **StatusBadge** — badge de color por estado

### Flujo de estados

```
INGRESADO → EN_REVISION → REVISADO → ...
```

Para **Al cobro**: diagnóstico → cotización → espera repuestos/reparación → entrega  
Para **Garantía**: diagnóstico obligatorio con fotos → en espera de marca → resolución de marca

## Scripts

```bash
npm run dev       # Servidor de desarrollo con HMR
npm run build     # Build de producción
npm run preview   # Preview del build
npm run lint      # ESLint
```

## Relacionado

- [Backend (Django + DRF)](../backend)
