from django.contrib import admin
from .models import WorkOrder, BonusTier

@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ['display_number', 'service_type', 'repair_technician', 'created_at']
    list_filter  = ['service_type']
    search_fields = ['ot_number', 'brand_ot_number']

@admin.register(BonusTier)
class BonusTierAdmin(admin.ModelAdmin):
    list_display = ['label', 'threshold', 'bonus_amount']
