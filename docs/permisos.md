# Permisos por rol — Admos

Documento de referencia para capacitación de usuarios y configuración de accesos.  
**Última actualización:** 2026-05-17

---

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `RECEPCIONISTA` | Crea órdenes de trabajo, registra clientes y pagos, sube evidencias |
| `TECNICO` | Realiza revisiones, diagnósticos y reparaciones |
| `JEFE_TALLER` | Acceso completo. Administra usuarios, precios, pagos y datos sensibles |

---

## Matriz de permisos — Órdenes de Trabajo (OT)

| Acción | RECEPCIONISTA | TECNICO | JEFE_TALLER |
|--------|:---:|:---:|:---:|
| Ver listado de OTs | ✅ | ✅ | ✅ |
| Ver detalle de OT | ✅ | ✅ | ✅ |
| Crear OT | ✅ | ❌ | ✅ |
| Editar campos de OT | ❌ | ❌ | ✅ |
| Eliminar OT | ❌ | ❌ | ✅ |
| Transicionar estado | ✅ | ✅ | ✅ |
| Agregar repuesto | ❌ | ✅ | ✅ |
| Editar repuesto | ❌ | ✅ | ✅ |
| Eliminar repuesto | ❌ | ❌ | ✅ |
| Agregar pago | ✅ | ❌ | ✅ |
| Eliminar pago | ❌ | ❌ | ✅ |
| Subir recibo de pago | ✅ | ❌ | ✅ |
| Subir foto de diagnóstico | ✅ | ✅ | ✅ |
| Eliminar foto de diagnóstico | ❌ | ✅ | ✅ |

---

## Matriz de permisos — Clientes y Equipos

| Acción | RECEPCIONISTA | TECNICO | JEFE_TALLER |
|--------|:---:|:---:|:---:|
| Ver clientes | ✅ | ✅ | ✅ |
| Crear / editar cliente | ✅ | ❌ | ✅ |
| Eliminar cliente | ❌ | ❌ | ✅ |
| Ver equipos y marcas | ✅ | ✅ | ✅ |
| Crear / editar equipo | ✅ | ❌ | ✅ |
| Eliminar equipo | ❌ | ❌ | ✅ |
| Crear / editar marca | ❌ | ❌ | ✅ |

---

## Matriz de permisos — Usuarios del sistema

| Acción | RECEPCIONISTA | TECNICO | JEFE_TALLER |
|--------|:---:|:---:|:---:|
| Ver usuarios | ✅ | ✅ | ✅ |
| Crear usuario | ❌ | ❌ | ✅ |
| Editar usuario | ❌ | ❌ | ✅ |
| Ver perfil propio (`/me`) | ✅ | ✅ | ✅ |

---

## Notas de implementación

- Los permisos se validan en el backend (Django REST Framework). El frontend oculta opciones según el rol, pero la restricción real está en la API.
- El campo `role` del usuario determina el acceso. Valores válidos: `RECEPCIONISTA`, `TECNICO`, `JEFE_TALLER`.
- Solo el `JEFE_TALLER` puede crear nuevos usuarios desde la aplicación.
- Los permisos son aditivos: `JEFE_TALLER` hereda todo lo que puede hacer `RECEPCIONISTA` y `TECNICO`.

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-05-17 | Versión inicial del esquema de permisos |
