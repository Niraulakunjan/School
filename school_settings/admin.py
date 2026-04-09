from django.contrib import admin
from .models import SchoolSetting

@admin.register(SchoolSetting)
class SchoolSettingAdmin(admin.ModelAdmin):
    list_display = ('school_name', 'address', 'phone', 'email')
