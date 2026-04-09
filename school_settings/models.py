from django.db import models

class SchoolSetting(models.Model):
    """
    Singleton-like model for school-wide branding and contact details.
    Each school (tenant) will have only one record.
    """
    school_name = models.CharField(max_length=200, blank=True)
    logo        = models.ImageField(upload_to='school/logos/', null=True, blank=True)
    address     = models.CharField(max_length=255, blank=True)
    phone       = models.CharField(max_length=20, blank=True)
    email       = models.EmailField(blank=True)
    website     = models.URLField(blank=True)
    
    # Financial/Cycle Related
    academic_year = models.ForeignKey('finance.FinancialYear', on_delete=models.SET_NULL, null=True, blank=True, related_name='academic_schools', help_text="Current Academic Year for Students")
    fiscal_year   = models.ForeignKey('finance.FinancialYear', on_delete=models.SET_NULL, null=True, blank=True, related_name='fiscal_schools', help_text="Current Financial Year for Staff/Payroll")
    result_date   = models.CharField(max_length=20, blank=True, help_text="Default date for result sheets")
    
    def __str__(self):
        return f"Settings for {self.school_name or 'This School'}"

    class Meta:
        verbose_name = "School Setting"
        verbose_name_plural = "School Settings"
