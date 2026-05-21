from rest_framework.routers import DefaultRouter
from .views import WorkOrderViewSet, BonusTierViewSet

router = DefaultRouter()
router.register(r'orders', WorkOrderViewSet, basename='workorder')
router.register(r'bonus-tiers', BonusTierViewSet, basename='bonustier')

urlpatterns = router.urls
