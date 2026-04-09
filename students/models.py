from django.db import models
from django.conf import settings

class Student(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    BLOOD_GROUP_CHOICES = [('A+','A+'),('A-','A-'),('B+','B+'),('B-','B-'),('AB+','AB+'),('AB-','AB-'),('O+','O+'),('O-','O-')]
    GUARDIAN_CHOICES = [('father', 'Father'), ('mother', 'Mother'), ('other', 'Other')]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')

    # Basic Info
    admission_number    = models.CharField(max_length=50, unique=True, default='')
    registration_number = models.CharField(max_length=50, unique=True)
    roll_number         = models.CharField(max_length=20, blank=True, null=True)
    symbol_number       = models.CharField(max_length=50, blank=True, null=True)
    first_name          = models.CharField(max_length=100, default='')
    last_name           = models.CharField(max_length=100, blank=True)
    gender              = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    date_of_birth       = models.DateField()
    date_of_birth_bs    = models.CharField(max_length=10, blank=True, null=True)
    blood_group         = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True)
    admission_date      = models.DateField(blank=True, null=True)
    admission_date_bs   = models.CharField(max_length=10, blank=True, null=True)
    photo               = models.ImageField(upload_to='students/photos/', blank=True, null=True)

    # Class
    class_name          = models.CharField(max_length=50, blank=True)
    section             = models.CharField(max_length=20, blank=True)

    # Contact
    mobile_number       = models.CharField(max_length=15, blank=True)
    email               = models.EmailField(blank=True)

    # Physical
    height              = models.CharField(max_length=10, blank=True)
    weight              = models.CharField(max_length=10, blank=True)

    # IDs
    alns_emis_number    = models.CharField(max_length=100, blank=True)
    national_id         = models.CharField(max_length=100, blank=True)
    local_id            = models.CharField(max_length=100, blank=True)
    file_number         = models.CharField(max_length=50, blank=True)
    regs_number         = models.CharField(max_length=50, blank=True)

    # Guardian
    guardian_is         = models.CharField(max_length=10, choices=GUARDIAN_CHOICES, default='father')
    guardian_name       = models.CharField(max_length=100)
    guardian_phone      = models.CharField(max_length=15)
    guardian_relation   = models.CharField(max_length=50, blank=True)
    guardian_email      = models.EmailField(blank=True)
    guardian_occupation = models.CharField(max_length=100, blank=True)
    guardian_address    = models.TextField(blank=True)

    # Father
    father_name         = models.CharField(max_length=100, blank=True)
    father_phone        = models.CharField(max_length=15, blank=True)
    father_occupation   = models.CharField(max_length=100, blank=True)

    # Mother
    mother_name         = models.CharField(max_length=100, blank=True)
    mother_phone        = models.CharField(max_length=15, blank=True)
    mother_occupation   = models.CharField(max_length=100, blank=True)

    # Address
    current_address     = models.TextField(blank=True)
    permanent_address   = models.TextField(blank=True)

    # Misc
    previous_school     = models.TextField(blank=True)
    note                = models.TextField(blank=True)
    elective_subjects   = models.ManyToManyField('academics.Subject', blank=True, related_name='students_enrolled')
    bus_route           = models.ForeignKey('finance.BusRoute', on_delete=models.SET_NULL, null=True, blank=True, related_name='students')

    enrolled_at         = models.DateTimeField(auto_now_add=True)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.full_name} ({self.admission_number})"


DOC_TYPE_CHOICES = [
    ('citizenship',   'Citizenship'),
    ('birth_cert',    'Janma Dartha (Birth Certificate)'),
    ('passport',      'Passport'),
    ('character',     'Character Certificate'),
    ('migration',     'Migration Certificate'),
    ('marksheet',     'Marksheet'),
    ('other',         'Other'),
]

class StudentDocument(models.Model):
    student     = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='documents')
    doc_type    = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    title       = models.CharField(max_length=100, blank=True)
    file        = models.FileField(upload_to='students/documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} — {self.get_doc_type_display()}"


class StudentAttendance(models.Model):
    STATUS_CHOICES = [
        ('P', 'Present'),
        ('A', 'Absent'),
        ('L', 'Late'),
        ('H', 'Holiday'),
    ]

    student    = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date       = models.DateField()
    status     = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    remark     = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'date')
        ordering = ['-date', 'student']

    def __str__(self):
        return f"{self.student} — {self.date} — {self.get_status_display()}"


class SchoolHoliday(models.Model):
    """School-wide holiday. On a holiday date all student attendance defaults to H."""
    date        = models.DateField(unique=True)
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.title} ({self.date})"
