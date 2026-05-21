from rest_framework import serializers
from apps.users.models import User
from .models import WorkOrder, StatusHistory, SparePart, Payment, DiagnosticPhoto, BonusTier


class BonusTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonusTier
        fields = ['id', 'threshold', 'bonus_amount', 'label']


class SparePartSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = SparePart
        fields = ['id', 'description', 'quantity', 'unit_price', 'subtotal', 'available_in_shop', 'client_pays', 'created_at']
        read_only_fields = ['id', 'created_at']


class SparePartInlineSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=200)
    quantity = serializers.IntegerField(min_value=1, default=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    available_in_shop = serializers.BooleanField(default=False)
    client_pays = serializers.BooleanField(default=True)


class PaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'amount', 'notes', 'receipt_url', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'receipt_url', 'created_by_name', 'created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username


class DiagnosticPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticPhoto
        fields = ['id', 'image_url', 'caption', 'created_at']
        read_only_fields = ['id', 'image_url', 'created_at']


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_by_name', 'changed_at', 'notes']

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() or obj.changed_by.username


class WorkOrderListSerializer(serializers.ModelSerializer):
    display_number = serializers.CharField(read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    equipment_product_type = serializers.CharField(source='equipment.product_type', read_only=True)
    equipment_brand = serializers.CharField(source='equipment.brand.name', read_only=True, default=None)
    equipment_model = serializers.CharField(source='equipment.model', read_only=True, default=None)

    class Meta:
        model = WorkOrder
        fields = [
            'id', 'ot_number', 'display_number', 'service_type', 'status',
            'client', 'client_name', 'client_phone',
            'equipment', 'equipment_product_type', 'equipment_brand', 'equipment_model',
            'created_at', 'updated_at',
        ]


class WorkOrderDetailSerializer(serializers.ModelSerializer):
    display_number           = serializers.CharField(read_only=True)
    final_price              = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    saldo                    = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    client_labor_cost        = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True, required=False)
    valid_transitions        = serializers.ListField(source='get_valid_transitions', read_only=True)
    status_history           = StatusHistorySerializer(many=True, read_only=True)
    client_detail            = serializers.SerializerMethodField()
    equipment_detail         = serializers.SerializerMethodField()
    warranty_brand_name      = serializers.CharField(source='warranty_brand.name', read_only=True, default=None)
    created_by_name          = serializers.SerializerMethodField()
    reviewing_technician_name = serializers.SerializerMethodField()
    repair_technician_name   = serializers.SerializerMethodField()
    spare_parts              = SparePartSerializer(many=True, read_only=True)
    spare_parts_total        = serializers.SerializerMethodField()
    payments                 = PaymentSerializer(many=True, read_only=True)
    payments_total           = serializers.SerializerMethodField()
    diagnostic_photos        = DiagnosticPhotoSerializer(many=True, read_only=True)

    def get_spare_parts_total(self, obj):
        if hasattr(obj, 'spare_parts_total_ann'):
            return obj.spare_parts_total_ann
        return sum(
            p.quantity * p.unit_price
            for p in obj.spare_parts.all()
            if p.unit_price is not None
        )

    def get_payments_total(self, obj):
        if hasattr(obj, 'payments_total_ann'):
            return obj.payments_total_ann
        return sum(p.amount for p in obj.payments.all())

    def get_client_detail(self, obj):
        c = obj.client
        return {
            'name': c.name,
            'document_type': c.document_type,
            'document_number': c.document_number,
            'phone': c.phone,
            'address': c.address,
        }

    def get_equipment_detail(self, obj):
        e = obj.equipment
        return {
            'brand_name': e.brand.name if e.brand else None,
            'product_type': e.product_type,
            'model': e.model,
            'category': e.category,
        }

    def _user_name(self, user):
        if not user:
            return None
        return user.get_full_name() or user.username

    def get_created_by_name(self, obj):
        return self._user_name(obj.created_by)

    def get_reviewing_technician_name(self, obj):
        return self._user_name(obj.reviewing_technician)

    def get_repair_technician_name(self, obj):
        return self._user_name(obj.repair_technician)

    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = [
            'id', 'ot_number', 'display_number', 'status', 'valid_transitions',
            'final_price', 'saldo',
            'created_by', 'reviewing_technician', 'repair_technician',
            'created_at', 'updated_at', 'delivered_at',
            'status_history', 'spare_parts', 'payments',
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        equipment = validated_data.get('equipment')

        if equipment:
            if not validated_data.get('revision_cost') and equipment.default_revision_cost:
                validated_data['revision_cost'] = equipment.default_revision_cost
            if not validated_data.get('labor_cost') and equipment.default_labor_cost:
                validated_data['labor_cost'] = equipment.default_labor_cost

        validated_data['created_by'] = user
        work_order = super().create(validated_data)

        StatusHistory.objects.create(
            work_order=work_order,
            from_status='',
            to_status=work_order.status,
            changed_by=user,
            notes='OT creada',
        )
        return work_order


class StatusTransitionSerializer(serializers.Serializer):
    new_status            = serializers.ChoiceField(choices=WorkOrder.Status.choices)
    notes                 = serializers.CharField(required=False, allow_blank=True, default='')
    spare_parts           = SparePartInlineSerializer(many=True, required=False, default=list)
    was_repaired          = serializers.BooleanField(required=False, allow_null=True, default=None)
    reviewing_technician  = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), required=False, allow_null=True, default=None
    )
    repair_technician     = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), required=False, allow_null=True, default=None
    )

    def validate(self, data):
        work_order = self.context['work_order']
        new_status = data.get('new_status')

        if new_status == WorkOrder.Status.ENTREGADO and work_order.saldo > 0:
            raise serializers.ValidationError(
                f'No se puede entregar. Saldo pendiente: ${work_order.saldo:,.0f}'
            )

        if (new_status == WorkOrder.Status.REVISADO
                and work_order.service_type == WorkOrder.ServiceType.GARANTIA):
            if not data.get('notes', '').strip():
                raise serializers.ValidationError(
                    'El diagnóstico es obligatorio al marcar revisado en una OT de garantía.'
                )
            if not work_order.diagnostic_photos.exists():
                raise serializers.ValidationError(
                    'Se requiere al menos una foto de evidencia antes de marcar revisado en garantía.'
                )

        return data

    def validate_new_status(self, value):
        work_order = self.context['work_order']
        valid = work_order.get_valid_transitions()
        if value not in valid:
            raise serializers.ValidationError(
                f'Transición no permitida. Desde "{work_order.get_status_display()}" '
                f'solo se puede pasar a: {valid}'
            )
        return value
