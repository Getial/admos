from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display  = ['name', 'document_type', 'document_number', 'phone', 'created_at']
    search_fields = ['name', 'document_number']
    list_filter   = ['document_type']
