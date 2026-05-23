from django.contrib import admin
from django.urls import path, include
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class ThrottledTokenView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', ThrottledTokenView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.clients.urls')),
    path('api/', include('apps.equipment.urls')),
    path('api/', include('apps.orders.urls')),
    path('api/', include('apps.dashboard.urls')),
]
