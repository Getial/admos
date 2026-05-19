from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.orders.permissions import IsTallerChief
from .models import User
from .serializers import UserSerializer, UserCreateSerializer


class UserViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'username']

    def get_queryset(self):
        qs = User.objects.filter(is_active=True).order_by('first_name')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    def get_permissions(self):
        # Ver usuarios y perfil propio — todos los autenticados
        if self.action in ('list', 'retrieve', 'me'):
            return [IsAuthenticated()]
        # Crear, editar, eliminar — solo jefe de taller
        return [IsTallerChief()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        return Response(UserSerializer(request.user).data)
