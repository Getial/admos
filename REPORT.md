# Reporte de Calidad — Admos

**Análisis inicial:** 2026-05-16  
**Stack:** Django 6 + DRF · React 19 + Vite · PostgreSQL · Cloudinary

## Leyenda de estado

| Símbolo | Significado |
|---------|-------------|
| `[ ]` | Pendiente |
| `[~]` | En progreso |
| `[x]` | Resuelto |

---

## 🔴 CRÍTICO

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| C1 | `[x]` | `.env` con credenciales reales (SECRET_KEY, DB password, Cloudinary keys) en el repositorio | `backend/.env` | No había repo git — el `.env` nunca fue commiteado. Se creó `.gitignore` raíz con cobertura explícita de `.env` y `backend/.env.example` con placeholders. |
| C2 | `[x]` | Sin permisos a nivel de objeto en `WorkOrderViewSet` — cualquier usuario autenticado puede ver, editar y transicionar OTs ajenas | `orders/views.py:20` | Creado `orders/permissions.py` con `IsTallerChief`, `IsRecepcionistaOrChief`, `IsTecnicoOrChief`. Aplicado `get_permissions()` por acción en `WorkOrderViewSet`, `ClientViewSet`, `BrandViewSet` y `EquipmentViewSet`. Esquema documentado en `docs/permisos.md`. |

---

## 🟠 ALTO

### Backend

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| A1 | `[x]` | N+1 query: `spare_parts.all()` llamado por cada OT en el serializer de lista | `orders/serializers.py:89-97` | Anotaciones con `Subquery` en `get_queryset()` para `spare_parts_total_ann` y `payments_total_ann`. El serializer lee el campo anotado con fallback al cálculo Python. |
| A2 | `[x]` | N+1 query: `self.payments.all()` en la property `saldo` del modelo | `orders/models.py:108-114` | Resuelto junto con A1 — `payments_total_ann` en el queryset cubre este caso. La property del modelo sigue funcionando para usos fuera del queryset anotado. |
| A3 | `[ ]` | Race condition en generación de `ot_number`: dos guardados simultáneos pueden producir el mismo número | `orders/models.py:76-80` | Envolver en `@transaction.atomic` con `select_for_update()` sobre el Max, o usar una secuencia de base de datos. |
| A4 | `[ ]` | Sin manejo de errores en uploads a Cloudinary — si la API falla, el servidor devuelve 500 genérico | `orders/views.py:139-183` | Envolver `cloudinary.uploader.upload` en `try/except cloudinary.exceptions.Error` y devolver 502 con mensaje claro. Igual para el `destroy()` previo al reemplazo. |
| A5 | `[ ]` | `transition()` sin `@transaction.atomic` — si algo falla a mitad, queda historial de estado sin el cambio en la OT | `orders/views.py:48-94` | Decorar el método con `@transaction.atomic`. |
| A6 | `[ ]` | Sin rate limiting en `/api/token/` — el endpoint de login es vulnerable a fuerza bruta | `config/settings/` | Configurar `DEFAULT_THROTTLE_CLASSES` en DRF settings con `AnonRateThrottle` y un throttle específico para el endpoint de token (ej. 20/min). |

### Frontend

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| A7 | `[ ]` | Sin Error Boundaries — un error en un dialog puede crashear toda la app | (ausente) | Crear `ErrorBoundary.jsx` y envolver las rutas de features. |
| A8 | `[ ]` | Violaciones DRY severas: `CATEGORY_LABELS`, `formatCost()`, `formatDate()` y el patrón de extracción de errores de API duplicados en 4-5 archivos | `OrderDetail.jsx`, `OrdersPage.jsx`, `EquipmentPage.jsx`, `ClientForm.jsx`, `EquipmentForm.jsx`, `TransitionDialog.jsx` | Crear `/src/lib/constants.js` para constantes compartidas, `/src/lib/utils.js` para funciones de formato y un hook `useApiError(error)` para el patrón de error. |
| A9 | `[ ]` | Sin feedback de éxito en mutaciones — el usuario no sabe si la acción completó | múltiples | Implementar un sistema de toasts (ej. sonner o shadcn/ui toast) y dispararlo en `onSuccess` de las mutaciones críticas. |
| A10 | `[ ]` | `fetch(photo.image_url)` sin manejo de error — si la imagen falla, el anotador se queda en spinner infinito | `PhotoAnnotator.jsx:21` | Agregar `.catch()` al fetch y mostrar un mensaje de error al usuario. |

---

## 🟡 MEDIO

### Backend — Arquitectura

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| M1 | `[ ]` | Lógica de negocio (`final_price`, `saldo`, `get_valid_transitions`) directamente en el modelo | `orders/models.py:82-127` | Crear `orders/services.py` con `PricingService` y `WorkOrderStateMachine`. Dejar el modelo como contenedor de datos. |
| M2 | `[ ]` | `get_spare_parts_total()` y `get_payments_total()` en el serializer duplican cálculos del modelo | `orders/serializers.py:89-97` | Eliminar estos métodos y usar los campos anotados (ver A1/A2) o las propiedades del modelo. |
| M3 | `[ ]` | `get_client_detail()` y `get_equipment_detail()` construyen dicts manualmente en vez de usar serializers anidados | `orders/serializers.py:99-116` | Reemplazar por `ClientSerializer(source='client', read_only=True)` y `EquipmentSerializer(source='equipment', read_only=True)`. |
| M4 | `[ ]` | `_fresh_order()` re-ejecuta el queryset completo después de cada mutación — doble consulta innecesaria | `orders/views.py:43-45` | Usar `work_order.refresh_from_db()` sobre la instancia ya modificada y serializar directamente. |
| M5 | `[ ]` | Lógica de upload a Cloudinary repetida en `add_photo` y `upload_receipt` | `orders/views.py:139,162` | Extraer a `FileUploadService.upload_image(file, folder, quality, width)` en `services.py`. |
| M6 | `[x]` | Sin `permission_classes` explícito en `ClientViewSet`, `BrandViewSet` y `EquipmentViewSet` — depende de herencia implícita de settings | `clients/views.py:6`, `equipment/views.py:6-17` | Resuelto junto con C2 — todos los viewsets tienen ahora `get_permissions()` explícito con granularidad por acción. |
| M7 | `[ ]` | `WorkOrder.save()` no protege la generación de `ot_number` con lock (ver también A3) | `orders/models.py:76` | Agregar `select_for_update()` dentro de `@transaction.atomic`. |

### Backend — Escalabilidad y DB

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| M8 | `[ ]` | Sin índices en campos usados en búsqueda: `client.name`, `client.document_number` | `clients/models.py` | Agregar `class Meta: indexes = [models.Index(fields=['name']), models.Index(fields=['document_number'])]`. |
| M9 | `[ ]` | Sin índices en `Equipment.category` y combinación `(brand, category)` | `equipment/models.py` | Agregar índice compuesto `models.Index(fields=['brand', 'category'])`. |

### Frontend — Arquitectura

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| M10 | `[ ]` | `OrderDetail.jsx` tiene 1134 líneas con rendering, mutations, cálculos y helpers mezclados — complejidad ciclomática ~12-15 | `OrderDetail.jsx` | Dividir en sub-componentes: `OrderDetailHeader`, `OrderDetailClient`, `OrderDetailDiagnostics`, `OrderDetailCosts`, `OrderDetailPayments`, `OrderDetailTimeline`. |
| M11 | `[ ]` | 8 `useState` en `OrderDetail` sin custom hook | `OrderDetail.jsx` | Extraer `useOrderMutations()` y `useOrderForm()`. |
| M12 | `[ ]` | `EMPTY_PART` definido con estructura diferente en `OrderDetail` vs `TransitionDialog` (falta `available_in_shop` en uno) | `OrderDetail.jsx:122`, `TransitionDialog.jsx:12` | Unificar en `/src/lib/constants.js`. |
| M13 | `[ ]` | `invalidateQueries({ queryKey: ["orders"] })` invalida toda la lista cuando solo cambió una OT | `OrderDetail.jsx:144` | Usar `setQueryData(['order', id], res.data)` que ya se hace en algunas mutaciones — aplicarlo consistentemente en todas. |

### Seguridad

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| M14 | `[ ]` | JWT tokens en `localStorage` — accesibles vía XSS | `AuthContext.jsx:15-16` | Migrar a `httpOnly` cookies (requiere cambios en backend para CSRF) o implementar CSP headers como mitigación. |
| M15 | `[ ]` | Sin validación de MIME type ni tamaño máximo en uploads de fotos y recibos | `orders/views.py:162-183` | Validar `file.content_type in {'image/jpeg', 'image/png', 'image/webp'}` y `file.size <= 5MB` antes de llamar a Cloudinary. |
| M16 | `[ ]` | Headers de seguridad faltantes en configuración de producción: `SECURE_SSL_REDIRECT`, `HSTS`, cookies seguras | `config/settings/prod.py` | Agregar `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`. |
| M17 | `[ ]` | `fields = '__all__'` en `WorkOrderDetailSerializer` — frágil ante cambios de modelo y puede exponer campos no deseados | `orders/serializers.py:134` | Listar los campos explícitamente. |

---

## 🟢 BAJO — Deuda técnica

| ID | Estado | Problema | Archivo / Línea | Recomendación |
|----|--------|----------|-----------------|---------------|
| B1 | `[ ]` | `admin.py` vacíos en todos los apps | todos los apps | Registrar modelos clave (`WorkOrder`, `Client`, `Equipment`, `User`) con `ModelAdmin` y filtros básicos. |
| B2 | `[ ]` | `tests.py` vacíos — cero cobertura de pruebas | todos los apps | Agregar tests mínimos: transiciones de estado, cálculo de precios, validación de saldo en entrega. |
| B3 | `[ ]` | `get_valid_transitions()` con lógica de garantía mezclada — se puede simplificar con tablas de lookup separadas | `orders/models.py:116-127` | Definir `WARRANTY_TRANSITIONS` y `COBRO_TRANSITIONS` como dicts de clase. |
| B4 | `[ ]` | `StatusBadge`, `Section` y `Timeline` en `OrderDetail` no están memoizados | `OrderDetail.jsx` | Aplicar `React.memo()` a componentes que reciben props estables. |
| B5 | `[ ]` | Getters de nombre de usuario (`get_created_by_name`, `get_reviewing_technician_name`, `get_repair_technician_name`) repetidos 3 veces | `orders/serializers.py:118-130` | Crear un `UserNameField(SerializerMethodField)` reutilizable. |
| B6 | `[ ]` | Sin URL namespacing en el router | `config/urls.py` | Agregar `namespace` a cada `include()` para evitar colisiones futuras. |
| B7 | `[ ]` | Sin docstrings en métodos de negocio complejos (`transition()`, `get_valid_transitions()`, `final_price`) | `orders/models.py`, `orders/views.py` | Agregar docstring breve explicando el WHY en cada método no obvio. |
| B8 | `[ ]` | `EMPTY_PART` y `EMPTY_PAYMENT` definidos dentro del cuerpo del componente — se redefinen en cada render | `OrderDetail.jsx` | Mover las constantes fuera del componente. |

---

## Historial de correcciones

| Fecha | ID | Descripción |
|-------|----|-------------|
| 2026-05-16 | C1 | No había repo git — .env nunca commiteado. Creado `.gitignore` raíz y `backend/.env.example`. |
| 2026-05-17 | C2, M6 | Creado `orders/permissions.py`. Permisos por acción en todos los viewsets. Esquema en `docs/permisos.md`. |
| 2026-05-17 | A1, A2 | Subquery annotations en `get_queryset()` para totales. Serializer lee campos anotados. |
