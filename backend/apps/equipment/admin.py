from django.contrib import admin
from .models import Brand, Equipment

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display  = ['name', 'is_authorized']
    list_filter   = ['is_authorized']
    search_fields = ['name']

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display  = ['brand', 'product_type', 'model', 'category']
    list_filter   = ['category', 'brand']
    search_fields = ['product_type', 'model']
