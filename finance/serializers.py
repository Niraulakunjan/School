from rest_framework import serializers
from academics.models import Class
from .models import (
    FeeStructure, ClassFeeDetail, FeeItem, FeeCollection, StudentFeeEnrollment, 
    FinancialYear, Expense, BusRoute, SchoolIncome, SchoolExpenditure, 
    FeeDiscount, StudentDiscount, ClassMonthlyFee, MonthlyDemand
)


class ExpenseSerializer(serializers.ModelSerializer):
    financial_year_name = serializers.ReadOnlyField(source='financial_year.name')
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Expense
        fields = (
            'id', 'financial_year', 'financial_year_name', 'category', 'category_display',
            'amount', 'date', 'description', 'recipient', 'payment_method',
            'payment_method_display', 'attachment', 'created_at'
        )
        read_only_fields = ('id', 'created_at', 'category_display', 'payment_method_display', 'financial_year_name')


class FinancialYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialYear
        fields = ('id', 'name', 'start_date', 'end_date', 'start_date_bs', 'end_date_bs', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')



class FeeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeItem
        fields = ('id', 'name', 'amount', 'frequency', 'is_optional', 'billing_months')






class ClassFeeDetailSerializer(serializers.ModelSerializer):
    items = FeeItemSerializer(many=True, required=False)
    total_amount = serializers.ReadOnlyField()

    class Meta:
        model = ClassFeeDetail
        fields = ('id', 'class_name', 'faculty', 'items', 'total_amount')
        validators = [] 



    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        detail = ClassFeeDetail.objects.create(**validated_data)
        
        for item_data in items_data:
            FeeItem.objects.create(structure_detail=detail, **item_data)
        return detail




class FeeStructureSerializer(serializers.ModelSerializer):
    class_details = ClassFeeDetailSerializer(many=True)
    financial_year_name = serializers.SerializerMethodField()

    class Meta:
        model = FeeStructure
        fields = ('id', 'financial_year', 'financial_year_name', 'name', 'description', 'is_active', 'created_at', 'class_details')
        read_only_fields = ('id', 'created_at', 'financial_year_name')

    def get_financial_year_name(self, obj):
        return obj.financial_year.name if obj.financial_year else None

    def create(self, validated_data):
        details_data = validated_data.pop('class_details', [])
        structure = FeeStructure.objects.create(**validated_data)
        
        for detail_data in details_data:
            items_data = detail_data.pop('items', [])
            detail = ClassFeeDetail.objects.create(fee_structure=structure, **detail_data)
            for item_data in items_data:
                FeeItem.objects.create(structure_detail=detail, **item_data)
        return structure



    def update(self, instance, validated_data):
        from django.db import transaction, IntegrityError
        from django.db.models import ProtectedError
        from rest_framework.exceptions import ValidationError

        
        details_data = validated_data.pop('class_details', None)
        
        try:
            with transaction.atomic(using=instance._state.db or 'default'):
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                instance.save()
                
                if details_data is not None:
                    existing_details = {(d.class_name, d.faculty): d for d in instance.class_details.all()}
                    incoming_keys = set()
                    
                    for detail_data in details_data:
                        class_name = detail_data.get('class_name')
                        faculty = detail_data.get('faculty', '')
                        key = (class_name, faculty)
                        incoming_keys.add(key)
                        
                        items_data = detail_data.pop('items', [])
                        
                        if key in existing_details:
                            detail = existing_details[key]
                            for attr, value in detail_data.items():
                                setattr(detail, attr, value)
                            detail.save()
                        else:
                            detail = ClassFeeDetail.objects.create(fee_structure=instance, **detail_data)
                            
                        # Clean and recreate items for simplicity
                        detail.items.all().delete()
                        for item_data in items_data:
                            FeeItem.objects.create(structure_detail=detail, **item_data)

                    
                    # Remove deleted classes
                    for key, detail in existing_details.items():
                        if key not in incoming_keys:
                            try:
                                detail.delete()
                            except ProtectedError:
                                raise ValidationError({
                                    'class_details': f'Cannot remove {detail.class_name} {detail.faculty} as students are enrolled in it.'
                                })
            return instance
            
        except IntegrityError as e:
            raise ValidationError({'detail': f'Database integrity error: {str(e)}'})
        except Exception as e:
            raise ValidationError({'detail': f'Update failed: {str(e)}'})



class BusRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusRoute
        fields = ('id', 'name', 'description', 'price', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class StudentFeeEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_class = serializers.SerializerMethodField()
    total_due = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    fee_structure = serializers.SerializerMethodField()
    class_fee_name = serializers.SerializerMethodField()
    financial_year_name = serializers.SerializerMethodField()
    fee_items = FeeItemSerializer(source='class_fee_detail.items', many=True, read_only=True)

    class Meta:
        model = StudentFeeEnrollment
        fields = (
            'id', 'student', 'student_name', 'student_class', 'student_roll',
            'class_fee_detail', 'class_fee_name', 'fee_structure', 'fee_items',
            'financial_year', 'financial_year_name',
            'class_name', 'section', 'status',
            'enrolled_at', 'completed_at', 'notes',
            'total_due', 'total_paid', 'balance', 'admission_date',
        )
        read_only_fields = ('id', 'enrolled_at', 'completed_at', 'financial_year_name')

    def get_fee_structure(self, obj):
        return obj.class_fee_detail.fee_structure.id if obj.class_fee_detail else None

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip()

    def get_student_class(self, obj):
        return f"{obj.class_name} {obj.section}".strip()

    def get_student_roll(self, obj):
        return obj.student.roll_number

    student_roll = serializers.SerializerMethodField()
    admission_date = serializers.ReadOnlyField(source='student.admission_date')

    def get_class_fee_name(self, obj):
        d = obj.class_fee_detail
        if not d: return "Unknown"
        faculty_str = f" ({d.faculty})" if d.faculty else ""
        return f"{d.fee_structure.name} - {d.class_name}{faculty_str}"

    def get_financial_year_name(self, obj):
        return obj.financial_year.name if obj.financial_year else None

    def _get_cumulative_stats(self, obj):
        # Cache results on the object to avoid redundant queries (get_due, get_paid, get_balance)
        if hasattr(obj, '_cached_cumulative_stats'):
            return obj._cached_cumulative_stats

        from .models import MonthlyDemand, PreviousYearDue
        from django.db.models import Sum
        from decimal import Decimal
        
        up_to_month = self.context.get('up_to_month')
        m_idx = None
        if up_to_month:
            try:
                m_idx = int(up_to_month)
            except (ValueError, TypeError):
                m_idx = None
        
        # Use the same database as the parent object (multi-tenancy safety)
        db = obj._state.db or 'default'
        
        # 1. Base Demands
        demands = MonthlyDemand.objects.using(db).filter(student=obj.student, financial_year=obj.financial_year)
        if m_idx is not None:
            demands = demands.filter(month__lte=m_idx)
        
        demand_total = demands.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        demand_paid = demands.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        
        # 2. Previous Year Arrears (Always included)
        prev_dues = PreviousYearDue.objects.using(db).filter(student=obj.student, financial_year=obj.financial_year)
        prev_total = prev_dues.aggregate(total=Sum('opening_balance'))['total'] or Decimal('0.00')
        prev_paid = prev_dues.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        
        due = float(demand_total + prev_total)
        paid = float(demand_paid + prev_paid)
        balance = due - paid
        
        stats = { 'due': due, 'paid': paid, 'balance': balance }
        obj._cached_cumulative_stats = stats
        return stats

    def get_total_due(self, obj):
        return self._get_cumulative_stats(obj)['due']

    def get_total_paid(self, obj):
        return self._get_cumulative_stats(obj)['paid']

    def get_balance(self, obj):
        return self._get_cumulative_stats(obj)['balance']


class FeeCollectionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_class = serializers.SerializerMethodField()
    balance = serializers.ReadOnlyField()
    financial_year_name = serializers.SerializerMethodField()

    class Meta:
        model = FeeCollection
        fields = (
            'id', 'student', 'student_name', 'student_class', 'student_roll',
            'class_fee_detail', 'enrollment', 'receipt_number',
            'financial_year', 'financial_year_name', 'month',
            'amount_due', 'amount_paid', 'discount', 'fine',
            'payment_method', 'status', 'payment_date',
            'remarks', 'collected_by', 'created_at', 'balance', 'admission_date',
        )
        read_only_fields = ('id', 'created_at', 'receipt_number', 'financial_year_name')

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip()

    def get_student_class(self, obj):
        return obj.student.class_name

    def get_student_roll(self, obj):
        return obj.student.roll_number

    student_roll = serializers.SerializerMethodField()
    admission_date = serializers.ReadOnlyField(source='student.admission_date')

    def get_financial_year_name(self, obj):
        return obj.financial_year.name if obj.financial_year else None

from .models import ElectiveSubjectFee

class ElectiveSubjectFeeSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    class_name   = serializers.ReadOnlyField(source='class_obj.name')
    faculty      = serializers.ReadOnlyField(source='subject.faculty')

    class Meta:
        model = ElectiveSubjectFee
        fields = '__all__'


class SchoolIncomeSerializer(serializers.ModelSerializer):
    category_display       = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model  = SchoolIncome
        fields = (
            'id', 'date', 'title', 'category', 'category_display',
            'amount', 'description', 'received_from',
            'payment_method', 'payment_method_display',
            'reference_no', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'category_display', 'payment_method_display')


class SchoolExpenditureSerializer(serializers.ModelSerializer):
    category_display       = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model  = SchoolExpenditure
        fields = (
            'id', 'date', 'title', 'category', 'category_display',
            'amount', 'description', 'paid_to',
            'payment_method', 'payment_method_display',
            'receipt_no', 'attachment', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'category_display', 'payment_method_display')


class FeeDiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeDiscount
        fields = '__all__'


class StudentDiscountSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')
    discount_name = serializers.ReadOnlyField(source='discount.name')
    discount_display = serializers.SerializerMethodField()
    financial_year_name = serializers.ReadOnlyField(source='financial_year.name')

    class Meta:
        model = StudentDiscount
        fields = '__all__'

    def get_discount_display(self, obj):
        symbol = "%" if obj.discount.discount_type == 'percentage' else "Rs."
        return f"{obj.discount.value}{symbol}"
