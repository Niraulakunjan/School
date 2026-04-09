from django.contrib import admin
from .models import Class, Section, Subject, ClassSubject

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'faculty')

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'class_obj', 'capacity', 'is_active')
    list_filter = ('class_obj', 'is_active')

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'faculty', 'is_elective', 'is_active')
    list_filter = ('faculty', 'is_elective', 'is_active')
    search_fields = ('name', 'code')

@admin.register(ClassSubject)
class ClassSubjectAdmin(admin.ModelAdmin):
    list_display = ('class_obj', 'subject', 'is_optional', 'is_elective')
    list_filter = ('class_obj', 'subject', 'is_optional')
