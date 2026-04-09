from datetime import date
from rest_framework import viewsets, status, response
from rest_framework.decorators import action
from .models import Teacher, StaffSalaryStructure, StaffMonthlySalary, StaffPost, StaffCategory, PayrollSettings
from .serializers import TeacherSerializer, StaffSalaryStructureSerializer, StaffMonthlySalarySerializer, StaffPostSerializer, StaffCategorySerializer, PayrollSettingsSerializer
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth import get_user_model
User = get_user_model()

class StaffPostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StaffPost.objects.all()
    serializer_class = StaffPostSerializer

class StaffCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StaffCategory.objects.all()
    serializer_class = StaffCategorySerializer

class PayrollSettingsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = PayrollSettings.objects.all()
    serializer_class = PayrollSettingsSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer

    def get_queryset(self):
        return Teacher.objects.select_related('user', 'salary_structure', 'post', 'category').all()

    def create(self, request, *args, **kwargs):
        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        if not username or not password:
            return response.Response({"error": "Credentials required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create_user(
                username=username, email=email, password=password,
                first_name=data.get('first_name'), last_name=data.get('last_name'),
                role='TEACHER'
            )
            profile_data = data.copy()
            for f in ['username', 'email', 'password', 'first_name', 'last_name']: profile_data.pop(f, None)
            serializer = self.get_serializer(data=profile_data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=user)
            return response.Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StaffSalaryStructureViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StaffSalaryStructure.objects.all()
    serializer_class = StaffSalaryStructureSerializer

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        data = request.data
        if not isinstance(data, list): return response.Response({"error": "List expected"}, status=status.HTTP_400_BAD_REQUEST)
        updated = []
        try:
            for item in data:
                sid = item.get('staff')
                if not sid: continue
                basic_salary = item.get('basic_salary', 0)
                allowances = item.get('allowances', {})
                
                obj, _ = StaffSalaryStructure.objects.update_or_create(
                    staff_id=sid, 
                    defaults={
                        'basic_salary': basic_salary,
                        'allowances': allowances
                    }
                )
                updated.append(StaffSalaryStructureSerializer(obj).data)
            return response.Response(updated)
        except Exception as e: return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StaffMonthlySalaryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StaffMonthlySalary.objects.all()
    serializer_class = StaffMonthlySalarySerializer

    def get_queryset(self):
        m, y = self.request.query_params.get('month'), self.request.query_params.get('year')
        qs = StaffMonthlySalary.objects.select_related('staff__user', 'staff__post', 'staff__category').all()
        if m: qs = qs.filter(month=m)
        if y: qs = qs.filter(year=y)
        return qs

    @action(detail=False, methods=['post'])
    def generate_sheet(self, request):
        m, y = request.data.get('month'), request.data.get('year')
        if not m or not y: return response.Response({"error": "Month/Year required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            settings = PayrollSettings.objects.last()
            pf_p = float(settings.pf_percentage) if settings else 0
            tax_p = float(settings.tax_percentage) if settings else 0
            
            staff_list = Teacher.objects.filter(is_active_status='Active').select_related('salary_structure')
            generated = []
            for s in staff_list:
                struct = getattr(s, 'salary_structure', None)
                if not struct: continue
                
                basic = float(struct.basic_salary or 0)
                # Automated deductions
                pf_calc = (basic * pf_p) / 100
                tax_calc = (float(struct.total_earnings) * tax_p) / 100
                
                obj, _ = StaffMonthlySalary.objects.update_or_create(
                    staff=s, month=m, year=y,
                    defaults={
                        'basic_salary': basic,
                        'allowances': struct.allowances,
                        'payroll_tax': pf_calc, # Using as PF/SSF contribution
                        'salary_tax': tax_calc
                    }
                )
                generated.append(StaffMonthlySalarySerializer(obj).data)
            return response.Response(generated)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_absent(self, request):
        data = request.data # List of { id, absent_days, absent_less (optional) }
        for item in data:
            rid = item.get('id')
            days = item.get('absent_days', 0)
            less = item.get('absent_less')
            
            rec = StaffMonthlySalary.objects.get(id=rid)
            rec.absent_days = int(float(days) or 0)
            
            settings = PayrollSettings.objects.last()
            multiplier = (float(settings.absent_deduction_rate) / 100.0) if settings else 1.0
            
            if less is not None:
                rec.absent_less = float(less)
            else:
                daily_rate = float(rec.basic_salary) / 30
                rec.absent_less = daily_rate * float(days) * multiplier
            
            rec.save()
        return response.Response({"message": "Absences updated"})

    @action(detail=True, methods=['post'])
    def payout(self, request, pk=None):
        rec = self.get_object()
        rec.status = 'PAID'
        rec.payment_method = request.data.get('payment_method', 'CASH')
        rec.payout_date = request.data.get('payout_date', date.today())
        rec.save()
        return response.Response(StaffMonthlySalarySerializer(rec).data)

    @action(detail=False, methods=['post'])
    def accept_all(self, request):
        m, y = request.data.get('month'), request.data.get('year')
        StaffMonthlySalary.objects.filter(month=m, year=y).update(is_accepted=True, status='APPROVED')
        return response.Response({"message": "Approved all records"})
    permission_classes = [IsAuthenticated]
