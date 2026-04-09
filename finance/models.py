from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal


class FinancialYear(models.Model):
    name          = models.CharField(max_length=20, unique=True)
    start_date    = models.DateField(null=True, blank=True)
    end_date      = models.DateField(null=True, blank=True)
    start_date_bs = models.CharField(max_length=10, blank=True, null=True, help_text="Nepali Start Date (YYYY-MM-DD)")
    end_date_bs   = models.CharField(max_length=10, blank=True, null=True, help_text="Nepali End Date (YYYY-MM-DD)")

    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)


    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    def clean(self):
        # Ensure at least one format is provided for both start and end
        if not self.start_date and not self.start_date_bs:
            raise ValidationError("Please provide at least one start date (AD or BS).")
        if not self.end_date and not self.end_date_bs:
            raise ValidationError("Please provide at least one end date (AD or BS).")
        
        # If both AD dates are provided, ensure start < end
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValidationError("Start date must be before end date.")



class FeeStructure(models.Model):
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='fee_structures', null=True, blank=True)
    name           = models.CharField(max_length=200)
    description    = models.TextField(blank=True)
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-financial_year__start_date', 'name']

    def __str__(self):
        return f"{self.financial_year} — {self.name}"

class ClassFeeDetail(models.Model):
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name='class_details')
    class_name    = models.CharField(max_length=50)
    faculty       = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ('fee_structure', 'class_name', 'faculty')
        ordering = ['class_name', 'faculty']

    def __str__(self):
        faculty_str = f" ({self.faculty})" if self.faculty else ""
        return f"{self.class_name}{faculty_str} - {self.fee_structure.name}"

    @property
    def total_amount(self):
        from django.db.models import Sum
        db = self._state.db or 'default'
        
        # Sum Flexible / custom items based on their billing count
        total = 0
        for item in self.items.using(db).all():
            months = [m.strip() for m in item.billing_months.split(',') if m.strip()]
            total += float(item.amount) * len(months)
            
        return float(total)




class FeeItem(models.Model):
    FREQUENCY_CHOICES = [
        ('one_time',  'One Time'),
        ('monthly',   'Monthly'),
        ('yearly',    'Yearly'),
        ('quarterly', 'Quarterly'),
    ]
    structure_detail = models.ForeignKey(ClassFeeDetail, on_delete=models.CASCADE, related_name='items')
    name        = models.CharField(max_length=100)
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    frequency   = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    is_optional = models.BooleanField(default=False)
    billing_months = models.CharField(max_length=100, default='1,2,3,4,5,6,7,8,9,10,11,12', help_text="Comma separated Nepali months (1-12) when this fee is charged")

    def __str__(self):
        return f"{self.name} — Rs. {self.amount}"


class StudentFeeEnrollment(models.Model):
    """
    Registers a student into a fee structure for a specific academic year.
    This is the source of truth for what a student owes each year.
    Preserved across year transitions — never deleted, only new records added.
    """
    STATUS_CHOICES = [
        ('active',    'Active'),
        ('completed', 'Completed'),  # section/year completed
        ('transferred', 'Transferred'),
    ]

    student        = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='fee_enrollments')
    class_fee_detail = models.ForeignKey(ClassFeeDetail, on_delete=models.CASCADE, related_name='enrollments')
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='enrollments', null=True, blank=True)

    class_name     = models.CharField(max_length=50)
    section        = models.CharField(max_length=20, blank=True)
    status         = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    enrolled_at    = models.DateTimeField(auto_now_add=True)
    completed_at  = models.DateTimeField(null=True, blank=True)
    notes         = models.TextField(blank=True)

    class Meta:
        # A student can only be enrolled once per structure per year
        unique_together = ('student', 'class_fee_detail', 'financial_year')
        ordering = ['-financial_year__start_date', 'student__first_name']

    def __str__(self):
        return f"{self.student} — {self.financial_year} — {self.class_fee_detail}"

    def save(self, *args, **kwargs):
        if self.pk:
            old_instance = StudentFeeEnrollment.objects.get(pk=self.pk)
            if old_instance.status == 'completed' and self.status == 'completed':
                raise ValidationError("Cannot modify a completed enrollment.")
        super().save(*args, **kwargs)

    @property
    def total_due(self):
        from django.db.models import Sum
        # Use direct model calls instead of manager relations for property stability
        demand_total = MonthlyDemand.objects.filter(
            student=self.student,
            financial_year=self.financial_year
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        prev_due_total = PreviousYearDue.objects.filter(
            student=self.student,
            financial_year=self.financial_year
        ).aggregate(total=Sum('opening_balance'))['total'] or Decimal('0.00')
        
        return demand_total + prev_due_total

    @property
    def total_paid(self):
        from django.db.models import Sum
        demand_paid = MonthlyDemand.objects.filter(
            student=self.student,
            financial_year=self.financial_year
        ).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        
        prev_paid = PreviousYearDue.objects.filter(
            student=self.student,
            financial_year=self.financial_year
        ).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        
        return demand_paid + prev_paid

    @property
    def balance(self):
        return self.total_due - self.total_paid


class FeeCollection(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash',   'Cash'),
        ('cheque', 'Cheque'),
        ('online', 'Online Transfer'),
        ('esewa',  'eSewa'),
        ('khalti', 'Khalti'),
    ]
    STATUS_CHOICES = [
        ('paid',    'Paid'),
        ('partial', 'Partial'),
        ('pending', 'Pending'),
    ]

    student        = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='fee_payments')
    class_fee_detail = models.ForeignKey(ClassFeeDetail, on_delete=models.SET_NULL, null=True, blank=True, related_name='collections')
    enrollment     = models.ForeignKey(StudentFeeEnrollment, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    receipt_number = models.CharField(max_length=50, unique=True)
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='payments', null=True, blank=True)
    month          = models.CharField(max_length=20, blank=True)
    amount_due     = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid    = models.DecimalField(max_digits=10, decimal_places=2)
    discount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fine           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default='paid')
    payment_date   = models.DateField()
    remarks        = models.TextField(blank=True)
    collected_by   = models.CharField(max_length=100, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Receipt #{self.receipt_number} — {self.student}"

    @property
    def balance(self):
        return self.amount_due - self.amount_paid - self.discount + self.fine


class PreviousYearDue(models.Model):
    """Tracks debt carried over from the previous academic year."""
    student        = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='previous_year_dues')
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='previous_dues')
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'financial_year')

    def __str__(self):
        return f"Prev Due: {self.student} — {self.financial_year} (Rs. {self.opening_balance})"

    @property
    def balance(self):
        return self.opening_balance - self.amount_paid


class MonthlyDemand(models.Model):
    """The 'Invoice' generated each month for every student."""
    STATUS_CHOICES = [
        ('unpaid',  'Unpaid'),
        ('partial', 'Partial'),
        ('paid',    'Paid'),
    ]
    student        = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='monthly_demands')
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='monthly_demands')
    month          = models.IntegerField(help_text="Nepali Month (1=Baishakh, 12=Chaitra)")
    total_amount   = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Store a snapshot of items for historical accuracy
    fee_items_json = models.JSONField(default=dict, help_text="Snapshot of fee items at time of generation")
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default='unpaid')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'financial_year', 'month')
        ordering = ['financial_year__start_date', 'month']

    def __str__(self):
        return f"Demand: {self.student} — Month {self.month} ({self.financial_year})"

    @property
    def balance(self):
        return self.total_amount - self.amount_paid


class ClassMonthlyFee(models.Model):
    """Template for standard monthly fees per class fee detail (specific structure)."""
    structure_detail = models.ForeignKey(ClassFeeDetail, on_delete=models.CASCADE, related_name='monthly_fees')
    month            = models.IntegerField()
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('structure_detail', 'month')
        ordering = ['structure_detail', 'month']

    def __str__(self):
        return f"{self.structure_detail} - Month {self.month}"




class FeeDiscount(models.Model):
    """Defines a reusable discount policy (e.g. 50% Scholarship, Sibling Discount)."""
    TYPE_CHOICES = [
        ('percentage', 'Percentage (%)'),
        ('flat',       'Flat Amount (Rs.)'),
    ]
    name          = models.CharField(max_length=100, unique=True)
    discount_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='percentage')
    value         = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage (0-100) or Flat Amount")
    is_active     = models.BooleanField(default=True)
    description   = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        symbol = "%" if self.discount_type == 'percentage' else "Rs."
        return f"{self.name} ({self.value}{symbol})"


class StudentDiscount(models.Model):
    """Maps a specific student to a discount policy for an academic year."""
    student        = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='discounts')
    discount       = models.ForeignKey(FeeDiscount, on_delete=models.PROTECT, related_name='student_allocations')
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='student_discounts')
    is_active      = models.BooleanField(default=True)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'financial_year', 'discount')
        ordering = ['student__first_name', 'discount__name']

    def __str__(self):
        return f"{self.student} — {self.discount} ({self.financial_year})"


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('salary',      'Staff Salary'),
        ('rent',        'Rent & Lease'),
        ('utilities',   'Utilities (Elec/Water)'),
        ('maintenance', 'Maintenance & Repairs'),
        ('supplies',    'Stationery & Supplies'),
        ('sports',      'Sports & Events'),
        ('other',       'Miscellaneous'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cash',   'Cash'),
        ('cheque', 'Cheque'),
        ('online', 'Online Transfer'),
    ]

    financial_year = models.ForeignKey(FinancialYear, on_delete=models.PROTECT, related_name='expenses', null=True, blank=True)
    category       = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    amount         = models.DecimalField(max_digits=12, decimal_places=2)
    date           = models.DateField()
    description    = models.TextField(blank=True)
    recipient      = models.CharField(max_length=200, help_text="Who was paid (e.g., Staff Name, Shop Name)")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    attachment     = models.FileField(upload_to='expenses/attachments/', null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.category.title()} — Rs. {self.amount} for {self.recipient}"


class BusRoute(models.Model):
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True, help_text="List of stops or area description")
    price       = models.DecimalField(max_digits=10, decimal_places=2, help_text="Monthly fee for this route")
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} — Rs. {self.price}"
class ElectiveSubjectFee(models.Model):
    class_obj   = models.ForeignKey('academics.Class', on_delete=models.CASCADE, related_name='elective_fees')
    subject     = models.ForeignKey('academics.Subject', on_delete=models.CASCADE, related_name='fee_settings')
    fee_name    = models.CharField(max_length=100, help_text="e.g. Computer Fee, Music Lab Fee")
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('class_obj', 'subject')
        ordering = ['class_obj__name', 'subject__name']

    def __str__(self):
        return f"{self.class_obj.name} - {self.subject.name} Fee — Rs. {self.amount}"


# ─── Independent School Finance Models ────────────────────────────────────────
# These are NOT linked to student fee payments or the Expense model.
# They track the school's own income & expenditure ledger independently.

class SchoolIncome(models.Model):
    CATEGORY_CHOICES = [
        ('fee_income',   'Student Fee Income'),
        ('government',   'Government Grant / Fund'),
        ('donation',     'Donation'),
        ('bank_interest','Bank Interest'),
        ('sale',         'Sale of Assets / Materials'),
        ('event',        'Event / Program Income'),
        ('other',        'Other Income'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cash',   'Cash'),
        ('cheque', 'Cheque'),
        ('online', 'Online Transfer'),
        ('bank',   'Bank Deposit'),
    ]

    date           = models.DateField()
    title          = models.CharField(max_length=200)
    category       = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    amount         = models.DecimalField(max_digits=14, decimal_places=2)
    description    = models.TextField(blank=True)
    received_from  = models.CharField(max_length=200, blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    reference_no   = models.CharField(max_length=100, blank=True, help_text='Cheque/receipt/voucher number')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} — Rs. {self.amount} ({self.date})"


class SchoolExpenditure(models.Model):
    CATEGORY_CHOICES = [
        ('salary',       'Staff Salary'),
        ('rent',         'Rent & Lease'),
        ('electricity',  'Electricity'),
        ('water',        'Water'),
        ('internet',     'Internet / Phone'),
        ('stationery',   'Stationery & Supplies'),
        ('furniture',    'Furniture & Fixtures'),
        ('equipment',    'Equipment & Technology'),
        ('maintenance',  'Maintenance & Repairs'),
        ('sports',       'Sports & Events'),
        ('transport',    'Transport'),
        ('food',         'Food & Refreshments'),
        ('cleaning',     'Cleaning & Sanitation'),
        ('bank_charge',  'Bank Charges & Fees'),
        ('tax',          'Taxes & Government Fees'),
        ('other',        'Miscellaneous'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('cash',   'Cash'),
        ('cheque', 'Cheque'),
        ('online', 'Online Transfer'),
        ('bank',   'Bank Transfer'),
    ]

    date           = models.DateField()
    title          = models.CharField(max_length=200)
    category       = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    amount         = models.DecimalField(max_digits=14, decimal_places=2)
    description    = models.TextField(blank=True)
    paid_to        = models.CharField(max_length=200, blank=True, help_text='Vendor, staff name, etc.')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    receipt_no     = models.CharField(max_length=100, blank=True)
    attachment     = models.FileField(upload_to='school_finance/expenditure/', null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} — Rs. {self.amount} ({self.date})"

