from decimal import Decimal

from django.db import models, transaction
from django.db.models import Max

from apps.users.models import User
from apps.clients.models import Client
from apps.equipment.models import Equipment, Brand


class WorkOrder(models.Model):
    class ServiceType(models.TextChoices):
        COBRO = 'COBRO', 'Al cobro'
        GARANTIA = 'GARANTIA', 'Garantía'

    class Status(models.TextChoices):
        INGRESADO           = 'INGRESADO',           'Ingresado'
        EN_REVISION         = 'EN_REVISION',         'En revisión'
        REVISADO            = 'REVISADO',            'Revisado'
        EN_ESPERA_MARCA     = 'EN_ESPERA_MARCA',     'En espera de respuesta de marca'
        NEGACION_GARANTIA   = 'NEGACION_GARANTIA',   'Negación de garantía'
        COTIZADO            = 'COTIZADO',            'Cotizado'
        EN_ESPERA_ABONO     = 'EN_ESPERA_ABONO',     'En espera de abono'
        EN_ESPERA_REPUESTOS = 'EN_ESPERA_REPUESTOS', 'En espera de repuestos'
        REPUESTOS_EN_TALLER = 'REPUESTOS_EN_TALLER', 'Repuestos en taller'
        EN_REPARACION       = 'EN_REPARACION',       'En reparación'
        LISTO_PARA_ENTREGAR = 'LISTO_PARA_ENTREGAR', 'Listo para entregar'
        ENTREGADO           = 'ENTREGADO',           'Entregado'

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

    ot_number           = models.PositiveIntegerField(unique=True, editable=False, null=True, blank=True)
    client              = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='work_orders')
    equipment           = models.ForeignKey(Equipment, on_delete=models.PROTECT, related_name='work_orders')
    created_by          = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_orders')
    reviewing_technician = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True, related_name='reviewing_orders'
    )
    repair_technician   = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True, related_name='repair_orders'
    )
    service_type        = models.CharField(max_length=10, choices=ServiceType.choices)
    status              = models.CharField(max_length=25, choices=Status.choices, default=Status.INGRESADO)
    warranty_brand      = models.ForeignKey(
        Brand, on_delete=models.PROTECT, null=True, blank=True, related_name='warranty_orders'
    )
    serial_number       = models.CharField(max_length=100, blank=True)
    brand_ot_number     = models.CharField(max_length=100, blank=True)
    problem_description = models.TextField()
    received_condition  = models.TextField()
    revision_cost       = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    revision_paid       = models.BooleanField(default=False)
    labor_cost          = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    client_labor_cost   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    was_repaired        = models.BooleanField(null=True, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)
    delivered_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    OT_START = 3339

    def save(self, *args, **kwargs):
        if self.ot_number is None and not self.brand_ot_number:
            with transaction.atomic():
                last = (
                    WorkOrder.objects
                    .select_for_update()
                    .aggregate(Max('ot_number'))['ot_number__max']
                )
                self.ot_number = max((last or 0) + 1, self.OT_START)
                super().save(*args, **kwargs)
                return
        super().save(*args, **kwargs)

    @property
    def display_number(self):
        if self.service_type == self.ServiceType.GARANTIA and self.brand_ot_number:
            return self.brand_ot_number
        return f'{self.ot_number:06d}'

    @property
    def final_price(self):
        if self.service_type == self.ServiceType.GARANTIA:
            labor = self.client_labor_cost or Decimal('0')
            parts = sum(
                p.quantity * p.unit_price
                for p in self.spare_parts.all()
                if p.unit_price is not None and p.client_pays
            )
            return labor + parts
        if self.was_repaired is False:
            return self.revision_cost or Decimal('0')
        labor = self.labor_cost or Decimal('0')
        parts = sum(
            p.quantity * p.unit_price
            for p in self.spare_parts.all()
            if p.unit_price is not None
        )
        return labor + parts

    @property
    def taller_revenue(self):
        """Ingresos totales del taller por esta OT (marca + cliente)."""
        labor = (self.labor_cost or Decimal('0')) + (self.client_labor_cost or Decimal('0'))
        parts = sum(
            p.quantity * p.unit_price
            for p in self.spare_parts.all()
            if p.unit_price is not None and (
                self.service_type == self.ServiceType.COBRO or p.client_pays
            )
        )
        if self.service_type == self.ServiceType.COBRO and self.was_repaired is False:
            return self.revision_cost or Decimal('0')
        return labor + parts

    @property
    def saldo(self):
        paid = sum(p.amount for p in self.payments.all())
        if self.service_type == self.ServiceType.GARANTIA:
            return self.final_price - paid
        revision_deduction = (self.revision_cost or Decimal('0')) if self.revision_paid else Decimal('0')
        return self.final_price - paid - revision_deduction

    def get_valid_transitions(self):
        if self.service_type == self.ServiceType.GARANTIA:
            # EN_REVISION → solo REVISADO (el diagnóstico va primero a la marca)
            if self.status == self.Status.EN_REVISION:
                return ['REVISADO']
            # REVISADO → solo EN_ESPERA_MARCA (gestión envía diagnóstico a la marca)
            if self.status == self.Status.REVISADO:
                return ['EN_ESPERA_MARCA']
        transitions = list(self.VALID_TRANSITIONS.get(self.status, []))
        if self.service_type == self.ServiceType.COBRO and 'EN_ESPERA_MARCA' in transitions:
            transitions.remove('EN_ESPERA_MARCA')
        return transitions

    def __str__(self):
        return f'OT {self.display_number} — {self.equipment}'


class SparePart(models.Model):
    work_order        = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='spare_parts')
    description       = models.CharField(max_length=200)
    quantity          = models.PositiveIntegerField(default=1)
    unit_price        = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    available_in_shop = models.BooleanField(default=False)
    client_pays       = models.BooleanField(default=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    @property
    def subtotal(self):
        if self.unit_price is None:
            return None
        return self.quantity * self.unit_price


class Payment(models.Model):
    work_order        = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='payments')
    amount            = models.DecimalField(max_digits=10, decimal_places=2)
    notes             = models.CharField(max_length=200, blank=True)
    receipt_url       = models.URLField(blank=True)
    receipt_public_id = models.CharField(max_length=200, blank=True)
    created_by        = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Abono OT {self.work_order.display_number}: ${self.amount}'


class DiagnosticPhoto(models.Model):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='diagnostic_photos')
    image_url  = models.URLField()
    public_id  = models.CharField(max_length=200)
    caption    = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class BonusTier(models.Model):
    threshold    = models.DecimalField(max_digits=12, decimal_places=2)
    bonus_amount = models.DecimalField(max_digits=12, decimal_places=2)
    label        = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['threshold']

    def __str__(self):
        return f'Meta ${self.threshold} → bono ${self.bonus_amount}'


class StatusHistory(models.Model):
    work_order   = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='status_history')
    from_status  = models.CharField(max_length=25, blank=True)
    to_status    = models.CharField(max_length=25)
    changed_by   = models.ForeignKey(User, on_delete=models.PROTECT)
    changed_at   = models.DateTimeField(auto_now_add=True)
    notes        = models.TextField(blank=True)

    class Meta:
        ordering = ['changed_at']

    def __str__(self):
        return f'OT {self.work_order.display_number}: {self.from_status} → {self.to_status}'
