from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from apps.orders.permissions import IsRecepcionistaOrChief, IsTallerChief
from .models import Brand, Equipment
from .serializers import BrandSerializer, EquipmentSerializer


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsTallerChief()]


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.select_related('brand').all()
    serializer_class = EquipmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['brand__name', 'model']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'destroy':
            return [IsTallerChief()]
        return [IsRecepcionistaOrChief()]
