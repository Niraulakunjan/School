from django.contrib import admin
from .models import Student, StudentDocument, StudentAttendance, SchoolHoliday

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('admission_number', 'first_name', 'last_name', 'class_name', 'section', 'mobile_number')
    search_fields = ('admission_number', 'first_name', 'last_name', 'registration_number')
    list_filter = ('class_name', 'section', 'gender', 'blood_group')

@admin.register(StudentDocument)
class StudentDocumentAdmin(admin.ModelAdmin):
    list_display = ('student', 'doc_type', 'title', 'uploaded_at')
    list_filter = ('doc_type',)

@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'date', 'status')
    list_filter = ('date', 'status')
    search_fields = ('student__first_name', 'student__last_name')

@admin.register(SchoolHoliday)
class SchoolHolidayAdmin(admin.ModelAdmin):
    list_display = ('title', 'date')
    search_fields = ('title',)
