from rest_framework import serializers
from .models import Teacher, StaffSalaryStructure, StaffMonthlySalary, StaffPost, StaffCategory, PayrollSettings
from users.serializers import UserSerializer

class StaffPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffPost
        fields = '__all__'

class StaffCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffCategory
        fields = '__all__'

class PayrollSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollSettings
        fields = '__all__'

class StaffSalaryStructureSerializer(serializers.ModelSerializer):
    total_earnings = serializers.ReadOnlyField()
    
    class Meta:
        model = StaffSalaryStructure
        fields = '__all__'

class StaffMonthlySalarySerializer(serializers.ModelSerializer):
    total_earnings = serializers.ReadOnlyField()
    total_deductions = serializers.ReadOnlyField()
    net_salary = serializers.ReadOnlyField()
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    post = serializers.SerializerMethodField()

    def get_post(self, obj):
        try:
            return obj.staff.post.name if obj.staff.post else "N/A"
        except AttributeError:
            return "N/A"
    bank_acc = serializers.CharField(source='staff.bank_acc', read_only=True)
    bank_branch = serializers.CharField(source='staff.bank_branch', read_only=True)
    
    class Meta:
        model = StaffMonthlySalary
        fields = '__all__'

class TeacherSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    salary_structure = StaffSalaryStructureSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    post_details = StaffPostSerializer(source='post', read_only=True)
    category_details = StaffCategorySerializer(source='category', read_only=True)
    
    class Meta:
        model = Teacher
        fields = '__all__'
