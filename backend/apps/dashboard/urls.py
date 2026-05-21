from django.urls import path
from .views import ProductivityView, EquipmentStatsView, RevenueView, RepairTimesView, BonusView

urlpatterns = [
    path('dashboard/productivity/',    ProductivityView.as_view(),    name='dashboard-productivity'),
    path('dashboard/equipment/',       EquipmentStatsView.as_view(),  name='dashboard-equipment'),
    path('dashboard/revenue/',         RevenueView.as_view(),         name='dashboard-revenue'),
    path('dashboard/repair-times/',    RepairTimesView.as_view(),     name='dashboard-repair-times'),
    path('dashboard/bonuses/',         BonusView.as_view(),           name='dashboard-bonuses'),
]
