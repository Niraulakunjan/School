from django.db import models
from django.conf import settings

class StaffPost(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name

class StaffCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name

class PayrollSettings(models.Model):
    pf_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    expense_category = models.CharField(max_length=100, default='salary')
    absent_deduction_rate = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    
    # Configurable Components Definition
    salary_components = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

class Teacher(models.Model):
    GENDER_CHOICES = [('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')]
    MARITAL_CHOICES = [('Married', 'Married'), ('Unmarried', 'Unmarried')]
    STATUS_CHOICES = [('Active', 'Active'), ('Inactive', 'Inactive')]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teacher_profile')
    employee_id = models.CharField(max_length=50, unique=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Personal Detail
    father_name = models.CharField(max_length=100, blank=True, null=True)
    grandfather_name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    job_start_date = models.DateField(blank=True, null=True)
    promoted_date = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Male')
    is_married = models.CharField(max_length=15, choices=MARITAL_CHOICES, default='Married')
    children_count = models.IntegerField(default=0)
    
    # Updated to ForeignKeys
    post = models.ForeignKey(StaffPost, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(StaffCategory, on_delete=models.SET_NULL, null=True, blank=True)
    
    bank_acc = models.CharField(max_length=100, blank=True, null=True)
    bank_branch = models.CharField(max_length=100, blank=True, null=True)
    is_active_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')

    # Others Information
    ssf_fund = models.CharField(max_length=100, blank=True, null=True)
    pan_no = models.CharField(max_length=50, blank=True, null=True)
    qualification = models.TextField(blank=True, null=True)
    training = models.TextField(blank=True, null=True)
    temp_address = models.TextField(blank=True, null=True)
    perm_address = models.TextField(blank=True, null=True)
    emergency_address = models.TextField(blank=True, null=True)
    language = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    
    joined_at = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"

class StaffSalaryStructure(models.Model):
    staff = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name='salary_structure')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Dynamic Allowances stored as {"component_name": amount}
    allowances = models.JSONField(default=dict, blank=True)

    @property
    def total_earnings(self):
        basic = float(self.basic_salary or 0)
        allow_total = sum(float(v) for v in self.allowances.values()) if self.allowances else 0
        return basic + allow_total

    def __str__(self):
        return f"Salary Struct: {self.staff.user.get_full_name()}"

class StaffMonthlySalary(models.Model):
    MONTH_CHOICES = [
        ('Baisakh', 'Baisakh'), ('Jestha', 'Jestha'), ('Ashad', 'Ashad'),
        ('Shrawan', 'Shrawan'), ('Bhadra', 'Bhadra'), ('Ashwin', 'Ashwin'),
        ('Kartik', 'Kartik'), ('Mangshir', 'Mangshir'), ('Poush', 'Poush'),
        ('Magh', 'Magh'), ('Falgun', 'Falgun'), ('Chaitra', 'Chaitra'),
    ]
    STATUS_CHOICES = [('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('PAID', 'Paid')]
    
    staff = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='monthly_salaries')
    financial_year = models.ForeignKey('finance.FinancialYear', on_delete=models.PROTECT, null=True, blank=True)
    month = models.CharField(max_length=20, choices=MONTH_CHOICES)
    year = models.CharField(max_length=10) # Keeping for legacy/display compatibility
    
    # Snapshot of earnings
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Dynamic Allowances stored as {"component_name": amount}
    allowances = models.JSONField(default=dict, blank=True)
    
    # Attendance
    absent_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    
    # Deductions
    advance_less = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salary_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    miss_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payroll_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_less = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    absent_less = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_accepted = models.BooleanField(default=False) # Legacy compatibility
    
    payment_method = models.CharField(max_length=20, blank=True, null=True)
    payout_date = models.DateField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_earnings(self):
        basic = float(self.basic_salary or 0)
        allow_total = sum(float(v) for v in self.allowances.values()) if self.allowances else 0
        return basic + allow_total

    @property
    def total_deductions(self):
        return float(
            (self.advance_less or 0) + (self.salary_tax or 0) + (self.miss_charge or 0) + 
            (self.payroll_tax or 0) + (self.other_less or 0) + (self.absent_less or 0)
        )

    @property
    def net_salary(self):
        return self.total_earnings - self.total_deductions

    def __str__(self):
        return f"Salary {self.month}: {self.staff.user.get_full_name()}"
