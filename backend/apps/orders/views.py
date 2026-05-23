import cloudinary.uploader
from decimal import Decimal
from django.db.models import DecimalField, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import User
from .models import WorkOrder, StatusHistory, SparePart, Payment, DiagnosticPhoto, BonusTier
from .permissions import IsTallerChief, IsRecepcionistaOrChief, IsTecnicoOrChief
from .serializers import (
    WorkOrderListSerializer,
    WorkOrderDetailSerializer,
    StatusTransitionSerializer,
    CoreUpdateSerializer,
    SparePartSerializer,
    PaymentSerializer,
    DiagnosticPhotoSerializer,
    BonusTierSerializer,
)


class WorkOrderViewSet(viewsets.ModelViewSet):

    def get_permissions(self):
        # Ver OTs — todos los usuarios autenticados
        if self.action in ('list', 'retrieve', 'transition'):
            return [IsAuthenticated()]
        # Crear OT — recepcionista o jefe
        if self.action == 'create':
            return [IsRecepcionistaOrChief()]
        # Repuestos (agregar/editar) — cualquier usuario autenticado del taller
        if self.action in ('add_spare_part', 'update_spare_part'):
            return [IsAuthenticated()]
        # Editar campos de la OT (labor_cost, costos, etc.) — recepcionista o jefe
        if self.action in ('update', 'partial_update'):
            return [IsRecepcionistaOrChief()]
        # Pagos (agregar) y recibos — recepcionista o jefe
        if self.action in ('add_payment', 'upload_receipt'):
            return [IsRecepcionistaOrChief()]
        # Fotos (subir) — todos los autenticados
        if self.action == 'add_photo':
            return [IsAuthenticated()]
        # Eliminar foto — técnico o jefe
        if self.action == 'remove_photo':
            return [IsTecnicoOrChief()]
        # Editar OT, eliminar OT, eliminar repuesto, eliminar pago — solo jefe
        return [IsTallerChief()]

    def get_queryset(self):
        _money = DecimalField(max_digits=12, decimal_places=2)

        spare_parts_subq = (
            SparePart.objects
            .filter(work_order=OuterRef('pk'), unit_price__isnull=False)
            .values('work_order')
            .annotate(total=Sum(F('quantity') * F('unit_price')))
            .values('total')
        )
        payments_subq = (
            Payment.objects
            .filter(work_order=OuterRef('pk'))
            .values('work_order')
            .annotate(total=Sum('amount'))
            .values('total')
        )

        qs = WorkOrder.objects.select_related(
            'client', 'equipment__brand',
            'created_by', 'reviewing_technician', 'repair_technician',
            'warranty_brand',
        ).prefetch_related(
            'spare_parts', 'payments', 'diagnostic_photos', 'status_history__changed_by',
        ).annotate(
            spare_parts_total_ann=Coalesce(Subquery(spare_parts_subq, output_field=_money), Decimal('0'), output_field=_money),
            payments_total_ann=Coalesce(Subquery(payments_subq, output_field=_money), Decimal('0'), output_field=_money),
        )

        search = self.request.query_params.get('search', '').strip()
        if search:
            q = (
                Q(client__name__icontains=search)
                | Q(client__document_number__icontains=search)
                | Q(serial_number__icontains=search)
                | Q(brand_ot_number__icontains=search)
            )
            if search.isdigit():
                q |= Q(ot_number=int(search))
            qs = qs.filter(q)

        status_filter = self.request.query_params.get('status')
        service_type = self.request.query_params.get('service_type')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if service_type:
            qs = qs.filter(service_type=service_type)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkOrderListSerializer
        return WorkOrderDetailSerializer

    def _fresh_order(self, pk, request):
        work_order = self.get_queryset().get(pk=pk)
        return WorkOrderDetailSerializer(work_order, context={'request': request}).data

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        work_order = self.get_object()
        serializer = StatusTransitionSerializer(
            data=request.data,
            context={'work_order': work_order},
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['new_status']
        notes = serializer.validated_data['notes']

        spare_parts_data = serializer.validated_data.get('spare_parts', [])
        creates_parts = new_status in (WorkOrder.Status.REVISADO, WorkOrder.Status.LISTO_PARA_ENTREGAR)
        if creates_parts and spare_parts_data:
            SparePart.objects.bulk_create([
                SparePart(
                    work_order=work_order,
                    description=p['description'],
                    quantity=p['quantity'],
                    unit_price=p.get('unit_price'),
                    available_in_shop=p.get('available_in_shop', False),
                    client_pays=p.get('client_pays', True),
                )
                for p in spare_parts_data
            ])

        is_tech = request.user.role in (User.Role.TECNICO, User.Role.JEFE_TALLER)
        if new_status == WorkOrder.Status.EN_REVISION and is_tech:
            work_order.reviewing_technician = request.user
        elif new_status == WorkOrder.Status.EN_REPARACION and is_tech and not work_order.repair_technician:
            work_order.repair_technician = request.user

        # Asignación manual de técnicos (para flujos que omiten EN_REVISION / EN_REPARACION)
        if serializer.validated_data.get('reviewing_technician') and not work_order.reviewing_technician:
            work_order.reviewing_technician = serializer.validated_data['reviewing_technician']
        if serializer.validated_data.get('repair_technician') and not work_order.repair_technician:
            work_order.repair_technician = serializer.validated_data['repair_technician']
        elif new_status == WorkOrder.Status.LISTO_PARA_ENTREGAR:
            was_repaired = serializer.validated_data.get('was_repaired')
            if was_repaired is not None:
                work_order.was_repaired = was_repaired
        elif new_status == WorkOrder.Status.ENTREGADO:
            work_order.delivered_at = timezone.now()

        StatusHistory.objects.create(
            work_order=work_order,
            from_status=work_order.status,
            to_status=new_status,
            changed_by=request.user,
            notes=notes,
        )

        work_order.status = new_status
        work_order.save()

        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='update-core')
    def update_core(self, request, pk=None):
        work_order = self.get_object()
        serializer = CoreUpdateSerializer(work_order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)

    # --- Repuestos ---

    @action(detail=True, methods=['post'], url_path='spare-parts')
    def add_spare_part(self, request, pk=None):
        work_order = self.get_object()
        serializer = SparePartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(work_order=work_order)
        return Response(self._fresh_order(pk, request), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='spare-parts/(?P<part_pk>[^/.]+)/update')
    def update_spare_part(self, request, pk=None, part_pk=None):
        work_order = self.get_object()
        part = get_object_or_404(SparePart, pk=part_pk, work_order=work_order)
        serializer = SparePartSerializer(part, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='spare-parts/(?P<part_pk>[^/.]+)')
    def remove_spare_part(self, request, pk=None, part_pk=None):
        work_order = self.get_object()
        get_object_or_404(SparePart, pk=part_pk, work_order=work_order).delete()
        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)

    # --- Pagos ---

    @action(detail=True, methods=['post'], url_path='payments')
    def add_payment(self, request, pk=None):
        work_order = self.get_object()
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(work_order=work_order, created_by=request.user)
        return Response(self._fresh_order(pk, request), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='payments/(?P<payment_pk>[^/.]+)')
    def remove_payment(self, request, pk=None, payment_pk=None):
        work_order = self.get_object()
        get_object_or_404(Payment, pk=payment_pk, work_order=work_order).delete()
        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='payments/(?P<payment_pk>[^/.]+)/receipt',
            parser_classes=[MultiPartParser, FormParser])
    def upload_receipt(self, request, pk=None, payment_pk=None):
        work_order = self.get_object()
        payment = get_object_or_404(Payment, pk=payment_pk, work_order=work_order)
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        if payment.receipt_public_id:
            cloudinary.uploader.destroy(payment.receipt_public_id)
        result = cloudinary.uploader.upload(
            file,
            folder=f'admos/receipts/{work_order.id}',
            resource_type='image',
            quality=85,
            width=1600,
            crop='limit',
        )
        payment.receipt_url = result['secure_url']
        payment.receipt_public_id = result['public_id']
        payment.save()
        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)

    # --- Fotos de diagnóstico ---

    @action(detail=True, methods=['post'], url_path='photos', parser_classes=[MultiPartParser, FormParser])
    def add_photo(self, request, pk=None):
        work_order = self.get_object()
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        result = cloudinary.uploader.upload(
            file,
            folder=f'admos/orders/{work_order.id}',
            resource_type='image',
            quality='auto',
            width=1920,
            crop='limit',
        )
        DiagnosticPhoto.objects.create(
            work_order=work_order,
            image_url=result['secure_url'],
            public_id=result['public_id'],
            caption=request.data.get('caption', ''),
            uploaded_by=request.user,
        )
        return Response(self._fresh_order(pk, request), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='photos/(?P<photo_pk>[^/.]+)')
    def remove_photo(self, request, pk=None, photo_pk=None):
        work_order = self.get_object()
        photo = get_object_or_404(DiagnosticPhoto, pk=photo_pk, work_order=work_order)
        cloudinary.uploader.destroy(photo.public_id)
        photo.delete()
        return Response(self._fresh_order(pk, request), status=status.HTTP_200_OK)


class BonusTierViewSet(viewsets.ModelViewSet):
    queryset = BonusTier.objects.all()
    serializer_class = BonusTierSerializer

    def get_permissions(self):
        return [IsTallerChief()]
