from django.db import models


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_authorized = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Equipment(models.Model):
    class Category(models.TextChoices):
        # Herramientas
        HERRAMIENTA_ELECTRICA_CABLE      = 'HERRAMIENTA_ELECTRICA_CABLE',      'Herramienta eléctrica con cable'
        HERRAMIENTA_ELECTRICA_INALAMBRIC = 'HERRAMIENTA_ELECTRICA_INALAMBRIC', 'Herramienta eléctrica inalámbrica'
        HERRAMIENTA_NEUMATICA            = 'HERRAMIENTA_NEUMATICA',            'Herramienta neumática'
        HERRAMIENTA_HIDRAULICA           = 'HERRAMIENTA_HIDRAULICA',           'Herramienta hidráulica'
        # Motores
        MOTOR_ELECTRICO                  = 'MOTOR_ELECTRICO',                  'Motor eléctrico'
        MOTOR_GASOLINA                   = 'MOTOR_GASOLINA',                   'Motor a gasolina'
        MOTOR_DIESEL                     = 'MOTOR_DIESEL',                     'Motor diésel'
        # Generación eléctrica
        PLANTA_ELECTRICA_GASOLINA        = 'PLANTA_ELECTRICA_GASOLINA',        'Planta eléctrica a gasolina'
        PLANTA_ELECTRICA_DIESEL          = 'PLANTA_ELECTRICA_DIESEL',          'Planta eléctrica diésel'
        # Soldadura y corte
        SOLDADOR_INVERSOR                = 'SOLDADOR_INVERSOR',                'Soldador inversor'
        SOLDADOR_CONVENCIONAL            = 'SOLDADOR_CONVENCIONAL',            'Soldador convencional'
        MOTOSOLDADOR                     = 'MOTOSOLDADOR',                     'Motosoldador'
        CORTADOR_PLASMA                  = 'CORTADOR_PLASMA',                  'Cortador de plasma'
        OXICORTE                         = 'OXICORTE',                         'Equipo de oxicorte'
        # Otros
        AGROFORESTAL                     = 'AGROFORESTAL',                     'Agroforestal (motosierra, guadaña, podadora)'
        LINEA_BLANCA                     = 'LINEA_BLANCA',                     'Línea blanca (electrodomésticos)'

    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, null=True, blank=True, related_name='equipment')
    product_type = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=150, blank=True)
    category = models.CharField(max_length=40, choices=Category.choices)
    notes = models.TextField(blank=True)
    default_revision_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    default_labor_cost    = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    brand_labor_price     = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        brand = self.brand.name if self.brand else 'Sin marca'
        model = self.model or 'Sin modelo'
        return f'{brand} {model}'
