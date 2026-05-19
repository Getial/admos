from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'document_type', 'document_number', 'name', 'phone', 'address', 'created_at']
        read_only_fields = ['id', 'created_at']
