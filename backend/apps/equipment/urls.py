from rest_framework.routers import DefaultRouter
from .views import BrandViewSet, EquipmentViewSet

router = DefaultRouter()
router.register(r'brands', BrandViewSet)
router.register(r'equipment', EquipmentViewSet)

urlpatterns = router.urls
