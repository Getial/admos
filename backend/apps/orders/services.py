import cloudinary.uploader
from decimal import Decimal


class FileUploadService:
    """Abstracción sobre Cloudinary para subida y eliminación de imágenes."""

    @staticmethod
    def upload_image(file, *, folder: str, quality, width: int) -> dict:
        """
        Sube una imagen a Cloudinary y retorna {'url': ..., 'public_id': ...}.
        Propaga la excepción de Cloudinary para que el caller devuelva 502.
        """
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type='image',
            quality=quality,
            width=width,
            crop='limit',
        )
        return {'url': result['secure_url'], 'public_id': result['public_id']}

    @staticmethod
    def destroy(public_id: str) -> None:
        """Elimina un recurso de Cloudinary. Propaga excepciones al caller."""
        cloudinary.uploader.destroy(public_id)


class PricingService:
    """Cálculo de precios y saldos de una OT."""

    @staticmethod
    def final_price(wo) -> Decimal:
        """
        Precio final a cobrar al cliente.
        GARANTIA: solo cargos al cliente (MO cliente + repuestos con client_pays).
        COBRO sin reparación: solo costo de revisión.
        COBRO con reparación: MO + todos los repuestos.
        """
        from apps.orders.models import WorkOrder

        if wo.service_type == WorkOrder.ServiceType.GARANTIA:
            labor = wo.client_labor_cost or Decimal('0')
            parts = sum(
                p.quantity * p.unit_price
                for p in wo.spare_parts.all()
                if p.unit_price is not None and p.client_pays
            )
            return labor + parts

        if wo.was_repaired is False:
            return wo.revision_cost or Decimal('0')

        labor = wo.labor_cost or Decimal('0')
        parts = sum(
            p.quantity * p.unit_price
            for p in wo.spare_parts.all()
            if p.unit_price is not None
        )
        return labor + parts

    @staticmethod
    def taller_revenue(wo) -> Decimal:
        """
        Ingresos totales del taller por esta OT (marca + cliente).
        Incluye MO de marca (labor_cost) en OTs de garantía.
        """
        from apps.orders.models import WorkOrder

        if wo.service_type == WorkOrder.ServiceType.COBRO and wo.was_repaired is False:
            return wo.revision_cost or Decimal('0')

        labor = (wo.labor_cost or Decimal('0')) + (wo.client_labor_cost or Decimal('0'))
        parts = sum(
            p.quantity * p.unit_price
            for p in wo.spare_parts.all()
            if p.unit_price is not None and (
                wo.service_type == WorkOrder.ServiceType.COBRO or p.client_pays
            )
        )
        return labor + parts

    @staticmethod
    def saldo(wo) -> Decimal:
        """Monto pendiente de pago por parte del cliente."""
        paid = sum(p.amount for p in wo.payments.all())
        final = PricingService.final_price(wo)

        from apps.orders.models import WorkOrder
        if wo.service_type == WorkOrder.ServiceType.GARANTIA:
            return final - paid

        revision_deduction = (wo.revision_cost or Decimal('0')) if wo.revision_paid else Decimal('0')
        return final - paid - revision_deduction


class WorkOrderStateMachine:
    """Reglas de transición de estado de una OT."""

    VALID_TRANSITIONS = {
        'INGRESADO':            ['EN_REVISION'],
        'EN_REVISION':          ['REVISADO', 'EN_ESPERA_MARCA', 'LISTO_PARA_ENTREGAR'],
        'REVISADO':             ['COTIZADO', 'LISTO_PARA_ENTREGAR'],
        'EN_ESPERA_MARCA':      ['EN_ESPERA_REPUESTOS', 'REPUESTOS_EN_TALLER', 'EN_REPARACION', 'NEGACION_GARANTIA', 'LISTO_PARA_ENTREGAR'],
        'NEGACION_GARANTIA':    ['COTIZADO', 'LISTO_PARA_ENTREGAR'],
        'COTIZADO':             ['EN_ESPERA_ABONO', 'EN_ESPERA_REPUESTOS', 'EN_REPARACION'],
        'EN_ESPERA_ABONO':      ['EN_ESPERA_REPUESTOS', 'REPUESTOS_EN_TALLER', 'EN_REPARACION'],
        'EN_ESPERA_REPUESTOS':  ['REPUESTOS_EN_TALLER'],
        'REPUESTOS_EN_TALLER':  ['EN_REPARACION'],
        'EN_REPARACION':        ['LISTO_PARA_ENTREGAR'],
        'LISTO_PARA_ENTREGAR':  ['ENTREGADO'],
        'ENTREGADO':            [],
    }

    @staticmethod
    def get_valid_transitions(wo) -> list:
        """
        Retorna los estados a los que puede transicionar esta OT según su tipo de servicio.
        GARANTIA restringe las primeras transiciones para forzar el flujo por la marca.
        COBRO excluye EN_ESPERA_MARCA.
        """
        from apps.orders.models import WorkOrder

        if wo.service_type == WorkOrder.ServiceType.GARANTIA:
            # EN_REVISION → solo REVISADO (diagnóstico va primero a la marca)
            if wo.status == WorkOrder.Status.EN_REVISION:
                return ['REVISADO']
            # REVISADO → solo EN_ESPERA_MARCA (gestión envía diagnóstico a la marca)
            if wo.status == WorkOrder.Status.REVISADO:
                return ['EN_ESPERA_MARCA']

        transitions = list(WorkOrderStateMachine.VALID_TRANSITIONS.get(wo.status, []))

        if wo.service_type == WorkOrder.ServiceType.COBRO and 'EN_ESPERA_MARCA' in transitions:
            transitions.remove('EN_ESPERA_MARCA')

        return transitions
