# Admos — Backend

API REST del sistema de gestión de órdenes de trabajo para **Taller Tesla**, taller de servicio técnico especializado en herramientas eléctricas, motores y equipos electromecánicos.

## Stack

| Capa                 | Tecnología                       |
| -------------------- | -------------------------------- |
| Framework            | Django 6 + Django REST Framework |
| Autenticación        | JWT (SimpleJWT)                  |
| Base de datos        | PostgreSQL (Neon)                |
| Archivos / Fotos     | Cloudinary                       |
| Variables de entorno | python-decouple                  |
| Deploy               | Render                           |

## Requisitos

- Python 3.12+
- PostgreSQL (o acceso a Neon)
- Cuenta de Cloudinary

## Desarrollo local

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurar variables de entorno (ver sección siguiente)

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

La API corre en `http://localhost:8000` por defecto.

## Variables de entorno

Crea un archivo `.env` en la raíz del backend:

```env
SECRET_KEY=tu_secret_key_de_django

DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

## Settings

El proyecto usa settings divididos por entorno:

```
config/settings/
├── base.py    # Configuración común
├── dev.py     # Desarrollo (DEBUG=True, CORS abierto)
├── prod.py    # Producción (Render)
└── local.py   # Overrides locales ignorados por git
```

Por defecto se carga `dev.py`. En producción se apunta a `prod.py` vía variable de entorno `DJANGO_SETTINGS_MODULE`.

## Estructura

```
apps/
├── users/      # Modelo de usuario personalizado
├── clients/    # Clientes del taller
├── equipment/  # Marcas y equipos (catálogo)
└── orders/     # Órdenes de trabajo — módulo principal
config/
├── settings/
├── urls.py
└── wsgi.py
```

## API

Toda la API requiere autenticación JWT. Incluir el header:

```
Authorization: Bearer <access_token>
```

### Autenticación

| Método | Endpoint              | Descripción            |
| ------ | --------------------- | ---------------------- |
| POST   | `/api/token/`         | Obtener tokens (login) |
| POST   | `/api/token/refresh/` | Renovar access token   |

### Órdenes de trabajo

| Método | Endpoint                                    | Descripción                                              |
| ------ | ------------------------------------------- | -------------------------------------------------------- |
| GET    | `/api/orders/`                              | Listar OTs (filtros: `status`, `service_type`, `search`) |
| POST   | `/api/orders/`                              | Crear OT                                                 |
| GET    | `/api/orders/{id}/`                         | Detalle de OT                                            |
| PATCH  | `/api/orders/{id}/`                         | Actualizar campos (labor_cost, revision_paid, etc.)      |
| POST   | `/api/orders/{id}/transition/`              | Cambiar estado                                           |
| POST   | `/api/orders/{id}/spare-parts/`             | Agregar repuesto                                         |
| PATCH  | `/api/orders/{id}/spare-parts/{id}/update/` | Actualizar repuesto (client_pays, etc.)                  |
| DELETE | `/api/orders/{id}/spare-parts/{id}/`        | Eliminar repuesto                                        |
| POST   | `/api/orders/{id}/payments/`                | Registrar pago/abono                                     |
| DELETE | `/api/orders/{id}/payments/{id}/`           | Eliminar pago                                            |
| POST   | `/api/orders/{id}/payments/{id}/receipt/`   | Subir comprobante de pago (multipart)                    |
| POST   | `/api/orders/{id}/photos/`                  | Subir foto de diagnóstico (multipart)                    |
| DELETE | `/api/orders/{id}/photos/{id}/`             | Eliminar foto de diagnóstico                             |

### Equipos

| Método           | Endpoint               | Descripción          |
| ---------------- | ---------------------- | -------------------- |
| GET/POST         | `/api/brands/`         | Marcas               |
| GET/PATCH/DELETE | `/api/brands/{id}/`    | Detalle de marca     |
| GET/POST         | `/api/equipment/`      | Equipos del catálogo |
| GET/PATCH/DELETE | `/api/equipment/{id}/` | Detalle de equipo    |

### Clientes y usuarios

| Método   | Endpoint        | Descripción         |
| -------- | --------------- | ------------------- |
| GET/POST | `/api/clients/` | Clientes            |
| GET/POST | `/api/users/`   | Usuarios del taller |

## Módulo de órdenes

### Modelos principales

- **WorkOrder** — OT con tipo de servicio (`COBRO` / `GARANTIA`), estado, costos y referencias al cliente y equipo
- **SparePart** — Repuesto asociado a una OT; `client_pays` distingue quién asume el costo en garantías
- **Payment** — Abono registrado contra una OT; admite comprobante en Cloudinary
- **DiagnosticPhoto** — Foto de evidencia del diagnóstico almacenada en Cloudinary
- **StatusHistory** — Registro inmutable de cada cambio de estado

### Campos calculados (propiedades, no columnas)

| Campo         | Fórmula                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `final_price` | COBRO: `labor_cost + Σ repuestos`. GARANTIA: `client_labor_cost + Σ repuestos con client_pays` |
| `saldo`       | COBRO: `final_price − pagos − revisión pagada`. GARANTIA: `final_price − pagos`                |

### Flujo de estados

```
INGRESADO → EN_REVISION → REVISADO → COTIZADO → EN_ESPERA_ABONO ─┐
                                   → EN_ESPERA_MARCA              │
                                                                   ├→ EN_ESPERA_REPUESTOS
                          NEGACION_GARANTIA → COTIZADO             ├→ REPUESTOS_EN_TALLER
                                                                   └→ EN_REPARACION → LISTO_PARA_ENTREGAR → ENTREGADO
```

**Garantía:** `EN_REVISION → REVISADO` requiere notas de diagnóstico y al menos una foto de evidencia. `REVISADO → EN_ESPERA_MARCA` (siempre, no puede saltarse).

**Entrega:** bloqueada si `saldo > 0`.

## Migraciones destacadas

| Migración        | Cambio                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `orders/0008`    | Elimina `final_price` como columna; agrega `Payment` y estado `EN_ESPERA_ABONO`          |
| `orders/0009`    | Agrega `DiagnosticPhoto` y campos de comprobante en `Payment` (Cloudinary)               |
| `orders/0010`    | Agrega `SparePart.client_pays` y `WorkOrder.client_labor_cost` para negación de garantía |
| `equipment/0004` | Agrega `brand_labor_price` para analítica de productividad (Fase 3)                      |

## Relacionado

- [Frontend (React + Vite)](https://github.com/Getial/admosFrontend)
