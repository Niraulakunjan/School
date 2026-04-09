from django.db import models


class Class(models.Model):
    name        = models.CharField(max_length=50, unique=True)  # e.g. "Grade 1", "Class 11"
    faculty     = models.CharField(max_length=100, blank=True)  # e.g. "Science", "Management"
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)        # for sorting
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Classes'

    def __str__(self):
        return f"{self.name}" + (f" ({self.faculty})" if self.faculty else "")


class Section(models.Model):
    class_obj  = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='sections')
    name       = models.CharField(max_length=20)   # e.g. "A", "B", "Red"
    capacity   = models.PositiveIntegerField(default=40)
    is_active  = models.BooleanField(default=True)

    class Meta:
        unique_together = ('class_obj', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.class_obj.name} - {self.name}"


class Subject(models.Model):
    name         = models.CharField(max_length=100)
    code         = models.CharField(max_length=20, blank=True)
    description  = models.TextField(blank=True)
    faculty      = models.CharField(max_length=100, blank=True)  # e.g. "Science"
    full_marks   = models.PositiveIntegerField(default=100)
    pass_marks   = models.PositiveIntegerField(default=35)
    order           = models.PositiveIntegerField(default=0)
    is_elective     = models.BooleanField(default=False)
    elective_group  = models.CharField(max_length=50, blank=True)
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name + (f" [{self.faculty}]" if self.faculty else "")


class ClassSubject(models.Model):
    class_obj    = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='subjects')
    subject      = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name='classes')
    is_optional  = models.BooleanField(default=False)
    is_elective     = models.BooleanField(default=False)
    elective_group  = models.CharField(max_length=50, blank=True)
    credit_hours    = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    full_marks   = models.PositiveIntegerField(default=100)
    pass_marks   = models.PositiveIntegerField(default=35)
    order        = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('class_obj', 'subject')
        ordering = ['order', 'subject__name']

    def __str__(self):
        try:
            return f"{self.class_obj.name} - {self.subject.name}"
        except Exception:
            return f"Orphaned Assignment (Class ID: {self.class_obj_id}, Sub ID: {self.subject_id})"
