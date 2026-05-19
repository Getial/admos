# Admos — Sistema de Gestión de Órdenes de Trabajo

Sistema interno para el taller **Taller Tesla**. Gestiona órdenes de trabajo (OTs), clientes, equipos, repuestos, pagos y diagnósticos fotográficos.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Django 6 + Django REST Framework |
| Base de datos | PostgreSQL (Neon) |
| Archivos / Fotos | Cloudinary |
| Deploy frontend | Vercel |
| Deploy backend | Render |

## Estructura del proyecto

```
Admos/
├── backend/        → API REST (Django + DRF)
│   ├── apps/
│   │   ├── users/
│   │   ├── clients/
│   │   ├── equipment/
│   │   └── orders/
│   ├── config/
│   │   └── settings/
│   │       ├── base.py
│   │       ├── dev.py
│   │       └── prod.py
│   ├── .env.example
│   └── requirements.txt
└── frontend/       → SPA (React + Vite)
    ├── src/
    │   ├── api/
    │   ├── components/
    │   └── features/
    │       ├── auth/
    │       ├── clients/
    │       ├── equipment/
    │       └── orders/
    └── package.json
```

## Configuración local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env          # completar variables reales
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variables de entorno

Ver [`backend/.env.example`](backend/.env.example) para la lista completa de variables requeridas.

## Flujo de estados de una OT

```
INGRESADO → EN_REVISION → REVISADO → COTIZADO → EN_REPARACION → COBRO → LISTO_PARA_ENTREGAR → ENTREGADO
                                    ↘ EN_ESPERA_MARCA (garantía)
                                    ↘ NEGACION_GARANTIA
```
