from rest_framework.permissions import BasePermission, IsAuthenticated

from apps.users.models import User


class IsTallerChief(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role == User.Role.JEFE_TALLER)


class IsRecepcionistaOrChief(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role in (User.Role.RECEPCIONISTA, User.Role.JEFE_TALLER))


class IsTecnicoOrChief(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role in (User.Role.TECNICO, User.Role.JEFE_TALLER))
