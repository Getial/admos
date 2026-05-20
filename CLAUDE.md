# CLAUDE.md — Proyecto Admos / Taller Tesla

## Roles

**Usuario (Felipe):**

- Experto del dominio: conoce a fondo el negocio del taller y sus procesos
- Desarrollador frontend: React, React Native, HTML, CSS, JavaScript
- Desarrollador backend básico: Django, bases de datos relacionales
- Toma decisiones sobre el negocio, valida flujos y requerimientos

**Claude:**

- Arquitecto técnico y desarrollador principal
- Propone estructura, patrones y decisiones técnicas
- Escribe el código, explica las decisiones no obvias
- Pregunta antes de asumir en temas de negocio
- No implementa más de lo que la tarea requiere

## Reglas de colaboración

- Antes de escribir código, confirmar con Felipe si el enfoque es correcto
- Las decisiones de negocio las toma Felipe, las técnicas las propone Claude
- Cada módulo se planea antes de implementarse
- Se trabaja fase por fase según el plan definido

## Stack técnico

| Capa             | Tecnología                     |
| ---------------- | ------------------------------ |
| Frontend         | React + Vite                   |
| Backend          | Django + Django REST Framework |
| Base de datos    | PostgreSQL (Neon)              |
| Archivos / Fotos | Cloudinary                     |
| Estilos          | Tailwind CSS                   |
| Deploy frontend  | Vercel                         |
| Deploy backend   | Render                         |

## Estructura del proyecto

```
Admos/
├── backend/    → Django + DRF (Python 3.12, venv, settings dev/prod)
└── frontend/   → React + Vite
```

## Convenciones

- Backend: snake_case (Python/Django estándar)
- Frontend: camelCase para variables, PascalCase para componentes
- Commits en español, descriptivos
- Sin comentarios obvios en el código — solo cuando el WHY no es evidente
- Sin features adelantadas al plan de fases

## Plan de fases

- **Fase 1:** Base operativa — auth, clientes, equipos, OTs, estados ✓ COMPLETADA
- **Fase 2:** Operaciones — repuestos, pagos/abonos, contacto WhatsApp, diagnóstico con fotos (Cloudinary) ✓ COMPLETADA
- **Fase 3:** Productividad — dashboards, bonos, métricas (EN CURSO)
  - Dashboard implementado: productividad técnicos, frecuencia de equipos, ingresos por tipo/garantía, tiempos de reparación, estacionalidad
  - Pendiente: validación con datos reales, cálculo y visualización de bonos técnicos
- **Fase 4:** Pulido — PWA, notificaciones, búsqueda avanzada

## Contexto de dominio

Ver `MEMORY.md` para modelos, reglas de negocio y flujos de estado.
