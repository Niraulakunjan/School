from django.contrib import admin
from .models import Exam, ExamRoutine, MarkLedger, ExamStudentSummary

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('name', 'term', 'financial_year', 'is_published')
    list_filter = ('term', 'financial_year', 'is_published')
    search_fields = ('name',)

@admin.register(ExamRoutine)
class ExamRoutineAdmin(admin.ModelAdmin):
    list_display = ('exam', 'subject', 'class_obj', 'exam_date', 'start_time')
    list_filter = ('exam', 'class_obj', 'exam_date')
    search_fields = ('subject__name', 'venue')

@admin.register(MarkLedger)
class MarkLedgerAdmin(admin.ModelAdmin):
    list_display = ('student', 'routine', 'marks_obtained', 'grade', 'is_absent')
    list_filter = ('routine__exam', 'routine__class_obj', 'is_absent')
    search_fields = ('student__first_name', 'student__last_name', 'routine__subject__name')

@admin.register(ExamStudentSummary)
class ExamStudentSummaryAdmin(admin.ModelAdmin):
    list_display = ('student', 'exam', 'class_obj', 'attendance')
    list_filter = ('exam', 'class_obj')
