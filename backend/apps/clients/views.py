from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from apps.orders.permissions import IsRecepcionistaOrChief, IsTallerChief
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'document_number', 'phone']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'destroy':
            return [IsTallerChief()]
        return [IsRecepcionistaOrChief()]
