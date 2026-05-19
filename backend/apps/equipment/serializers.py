from rest_framework import serializers
from .models import Brand, Equipment


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'is_authorized']


class EquipmentSerializer(serializers.ModelSerializer):
    brand_detail = BrandSerializer(source='brand', read_only=True)

    class Meta:
        model = Equipment
        fields = [
            'id', 'brand', 'brand_detail', 'product_type', 'model',
            'category', 'notes', 'default_revision_cost', 'default_labor_cost', 'brand_labor_price',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'brand_detail']
