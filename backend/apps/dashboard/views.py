from datetime import date
from decimal import Decimal

from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import WorkOrder, SparePart, StatusHistory
from apps.orders.permissions import IsTallerChief, IsTecnicoOrChief
from apps.users.models import User


def _parse_range(request):
    today = date.today()
    start = parse_date(request.query_params.get('start', '')) or today.replace(day=1)
    end = parse_date(request.query_params.get('end', '')) or today
    return start, end


def _name(user):
    return user.get_full_name() or user.username


class ProductivityView(APIView):
    """
    MO por técnico. Fecha de cierre = cuando OT llega a LISTO_PARA_ENTREGAR.
    TECNICO solo ve sus propios datos; JEFE ve todos.
    """
    permission_classes = [IsTecnicoOrChief]

    def get(self, request):
        start, end = _parse_range(request)
        user = request.user

        qs = (
            StatusHistory.objects
            .filter(
                to_status=WorkOrder.Status.LISTO_PARA_ENTREGAR,
                changed_at__date__gte=start,
                changed_at__date__lte=end,
                work_order__repair_technician__isnull=False,
            )
            .select_related('work_order__repair_technician')
        )

        if user.role == User.Role.TECNICO:
            qs = qs.filter(work_order__repair_technician=user)
        elif request.query_params.get('technician'):
            qs = qs.filter(work_order__repair_technician_id=request.query_params['technician'])

        by_tech = {}
        daily = {}

        for sh in qs:
            wo = sh.work_order
            tech = wo.repair_technician
            labor = (
                (wo.labor_cost or Decimal('0'))
                if wo.service_type == WorkOrder.ServiceType.COBRO
                else (wo.client_labor_cost or Decimal('0'))
            )
            day = str(sh.changed_at.date())

            if tech.id not in by_tech:
                by_tech[tech.id] = {
                    'technician_id': tech.id,
                    'name': _name(tech),
                    'ots': 0,
                    'labor': Decimal('0'),
                }
            by_tech[tech.id]['ots'] += 1
            by_tech[tech.id]['labor'] += labor

            day_key = (day, tech.id)
            if day_key not in daily:
                daily[day_key] = {
                    'date': day,
                    'technician_id': tech.id,
                    'technician_name': _name(tech),
                    'ots': 0,
                    'labor': Decimal('0'),
                }
            daily[day_key]['ots'] += 1
            daily[day_key]['labor'] += labor

        return Response({
            'period': {'start': str(start), 'end': str(end)},
            'by_technician': sorted(by_tech.values(), key=lambda x: x['labor'], reverse=True),
            'daily': sorted(daily.values(), key=lambda x: x['date']),
        })


class EquipmentStatsView(APIView):
    permission_classes = [IsTallerChief]

    def get(self, request):
        from django.db.models import Count, Sum, F

        start, end = _parse_range(request)
        qs = WorkOrder.objects.filter(created_at__date__gte=start, created_at__date__lte=end)

        top_equipment = list(
            qs.values(
                product_type=F('equipment__product_type'),
                brand=F('equipment__brand__name'),
                category=F('equipment__category'),
            )
            .annotate(count=Count('id'))
            .order_by('-count')[:15]
        )

        top_parts = list(
            SparePart.objects
            .filter(work_order__in=qs)
            .values('description')
            .annotate(total_qty=Sum('quantity'), times_used=Count('work_order_id', distinct=True))
            .order_by('-total_qty')[:15]
        )

        by_category = list(
            qs.values(category=F('equipment__category'))
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return Response({
            'period': {'start': str(start), 'end': str(end)},
            'top_equipment': top_equipment,
            'top_spare_parts': top_parts,
            'by_category': by_category,
        })


class RevenueView(APIView):
    permission_classes = [IsTallerChief]

    def get(self, request):
        start, end = _parse_range(request)

        # Revenue date = cuando OT llegó a LISTO_PARA_ENTREGAR
        transitions = (
            StatusHistory.objects
            .filter(
                to_status=WorkOrder.Status.LISTO_PARA_ENTREGAR,
                changed_at__date__gte=start,
                changed_at__date__lte=end,
            )
            .select_related('work_order__warranty_brand')
        )

        wo_ids = list({sh.work_order_id for sh in transitions})
        work_orders = {
            wo.id: wo
            for wo in WorkOrder.objects.filter(id__in=wo_ids).prefetch_related('spare_parts')
        }

        by_type = {
            'COBRO':    {'count': 0, 'total': Decimal('0')},
            'GARANTIA': {'count': 0, 'total': Decimal('0')},
        }
        by_brand = {}
        by_month = {}

        for sh in transitions:
            wo = work_orders.get(sh.work_order_id)
            if not wo:
                continue

            revenue = wo.final_price
            stype = wo.service_type
            month = sh.changed_at.strftime('%Y-%m')

            by_type[stype]['count'] += 1
            by_type[stype]['total'] += revenue

            if month not in by_month:
                by_month[month] = {'month': month, 'COBRO': Decimal('0'), 'GARANTIA': Decimal('0')}
            by_month[month][stype] += revenue

            if stype == WorkOrder.ServiceType.GARANTIA and sh.work_order.warranty_brand:
                bid = sh.work_order.warranty_brand_id
                if bid not in by_brand:
                    by_brand[bid] = {
                        'brand': sh.work_order.warranty_brand.name,
                        'count': 0,
                        'total': Decimal('0'),
                    }
                by_brand[bid]['count'] += 1
                by_brand[bid]['total'] += revenue

        return Response({
            'period': {'start': str(start), 'end': str(end)},
            'by_service_type': by_type,
            'warranty_by_brand': sorted(by_brand.values(), key=lambda x: x['total'], reverse=True),
            'by_month': sorted(by_month.values(), key=lambda x: x['month']),
        })


class RepairTimesView(APIView):
    permission_classes = [IsTallerChief]

    def get(self, request):
        start, end = _parse_range(request)

        listo_transitions = (
            StatusHistory.objects
            .filter(
                to_status=WorkOrder.Status.LISTO_PARA_ENTREGAR,
                changed_at__date__gte=start,
                changed_at__date__lte=end,
            )
        )

        wo_ids = list({sh.work_order_id for sh in listo_transitions})
        listo_by_wo = {sh.work_order_id: sh.changed_at for sh in listo_transitions}

        work_orders = {
            wo.id: wo
            for wo in WorkOrder.objects.filter(id__in=wo_ids).select_related('equipment')
        }

        # Fetch all status history for these OTs to calculate parts wait
        all_history = (
            StatusHistory.objects
            .filter(work_order_id__in=wo_ids)
            .order_by('work_order_id', 'changed_at')
        )
        history_by_wo = {}
        for sh in all_history:
            history_by_wo.setdefault(sh.work_order_id, []).append(sh)

        total_days_list = []
        with_parts_list = []
        without_parts_list = []
        by_category = {}

        for wo_id, listo_at in listo_by_wo.items():
            wo = work_orders.get(wo_id)
            if not wo:
                continue

            elapsed = (listo_at - wo.created_at).total_seconds() / 86400

            # Detectar si hubo espera de repuestos
            espera_at = None
            repuestos_at = None
            for sh in history_by_wo.get(wo_id, []):
                if sh.to_status == WorkOrder.Status.EN_ESPERA_REPUESTOS and not espera_at:
                    espera_at = sh.changed_at
                if sh.to_status == WorkOrder.Status.REPUESTOS_EN_TALLER and not repuestos_at:
                    repuestos_at = sh.changed_at

            total_days_list.append(elapsed)

            if espera_at and repuestos_at:
                with_parts_list.append(elapsed)
            else:
                without_parts_list.append(elapsed)

            cat = wo.equipment.category if wo.equipment else 'DESCONOCIDO'
            by_category.setdefault(cat, []).append(elapsed)

        def avg(lst):
            return round(sum(lst) / len(lst), 1) if lst else None

        return Response({
            'period': {'start': str(start), 'end': str(end)},
            'total_ots': len(total_days_list),
            'avg_total_days': avg(total_days_list),
            'avg_with_parts_wait': avg(with_parts_list),
            'count_with_parts_wait': len(with_parts_list),
            'avg_without_parts_wait': avg(without_parts_list),
            'count_without_parts_wait': len(without_parts_list),
            'by_category': sorted(
                [
                    {'category': cat, 'avg_days': avg(days), 'count': len(days)}
                    for cat, days in by_category.items()
                ],
                key=lambda x: x['avg_days'] or 0,
                reverse=True,
            ),
        })
