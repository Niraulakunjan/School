from django.db import models


from academics.models import Subject

class Exam(models.Model):
    TERM_CHOICES = [
        ('first',    'First Term'),
        ('mid',      'Mid Term'),
        ('third',    'Third Term'),
        ('final',    'Final / Annual'),
        ('pre',      'Pre-Board'),
        ('trial',    'Trial'),
        ('custom',   'Custom'),
    ]
    name           = models.CharField(max_length=150)
    term           = models.CharField(max_length=20, choices=TERM_CHOICES, default='first')
    financial_year = models.ForeignKey('finance.FinancialYear', on_delete=models.CASCADE, related_name='exams')
    start_date     = models.CharField(max_length=10, null=True, blank=True)  # Nepali MM:DD
    total_working_days = models.PositiveIntegerField(null=True, blank=True)
    remarks        = models.TextField(blank=True)
    is_published   = models.BooleanField(default=False)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class ExamRoutine(models.Model):
    exam        = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='routines')
    subject     = models.ForeignKey('academics.Subject', on_delete=models.CASCADE, related_name='routines')
    class_obj   = models.ForeignKey('academics.Class', on_delete=models.CASCADE, related_name='exam_routines', null=True, blank=True)
    exam_date   = models.CharField(max_length=10, null=True, blank=True)  # Nepali MM:DD
    start_time  = models.TimeField(null=True, blank=True)
    full_marks  = models.PositiveIntegerField(null=True, blank=True)   # overrides Subject default
    pass_marks  = models.PositiveIntegerField(null=True, blank=True)   # overrides Subject default
    venue       = models.CharField(max_length=100, blank=True)
    remarks     = models.TextField(blank=True)
    has_practical = models.BooleanField(default=False)
    theory_full_marks = models.PositiveIntegerField(null=True, blank=True)
    theory_pass_marks = models.PositiveIntegerField(null=True, blank=True)
    practical_full_marks = models.PositiveIntegerField(null=True, blank=True)
    practical_pass_marks = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['exam_date', 'start_time']
        unique_together = ('exam', 'subject', 'class_obj')

    @property
    def class_name(self):
        return self.class_obj.name if self.class_obj else 'Unknown'

    @property
    def faculty(self):
        return self.class_obj.faculty if self.class_obj else ''

    @property
    def effective_full_marks(self):
        return self.full_marks if self.full_marks is not None else 100

    @property
    def effective_pass_marks(self):
        return self.pass_marks if self.pass_marks is not None else 35

    def __str__(self):
        return f"{self.exam.name} — {self.subject.name} ({self.class_name}) {self.exam_date}"


class MarkLedger(models.Model):
    routine        = models.ForeignKey(ExamRoutine, on_delete=models.CASCADE, related_name='marks')
    student        = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='exam_marks')
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    theory_marks   = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    practical_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_absent      = models.BooleanField(default=False)
    remarks        = models.CharField(max_length=200, blank=True)
    entered_by     = models.CharField(max_length=100, blank=True)
    updated_at     = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.routine.has_practical:
            if self.theory_marks is None and self.practical_marks is None:
                self.marks_obtained = None
            else:
                tm = float(self.theory_marks) if self.theory_marks is not None else 0
                pm = float(self.practical_marks) if self.practical_marks is not None else 0
                self.marks_obtained = tm + pm
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('routine', 'student')
        ordering = ['student__class_name', 'student__roll_number']

    @property
    def grade(self):
        if self.is_absent:
            return 'AB'
        if self.marks_obtained is None:
            return '—'
        fm = self.routine.effective_full_marks
        pm = self.routine.effective_pass_marks
        pct = (float(self.marks_obtained) / fm * 100) if fm else 0
        if pct >= 90: return 'A+'
        if pct >= 80: return 'A'
        if pct >= 70: return 'B+'
        if pct >= 60: return 'B'
        if pct >= 50: return 'C+'
        if pct >= 40: return 'C'
        if float(self.marks_obtained) >= pm: return 'D'
        return 'NG'

    def __str__(self):
        return f"{self.student} — {self.routine.subject.name}: {self.marks_obtained}"

class ExamStudentSummary(models.Model):
    exam        = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='student_summaries')
    student     = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='exam_summaries')
    class_obj   = models.ForeignKey('academics.Class', on_delete=models.CASCADE)
    attendance  = models.PositiveIntegerField(null=True, blank=True)
    remarks     = models.CharField(max_length=200, blank=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('exam', 'student')
        ordering = ['student__class_name', 'student__roll_number']

    def __str__(self):
        return f"{self.student} summary for {self.exam}"
