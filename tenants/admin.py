from django.contrib import admin
from .models import SchoolTenant

@admin.register(SchoolTenant)
class SchoolTenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'domain_url', 'db_name', 'address', 'created_on')
    search_fields = ('name', 'domain_url', 'address')
    list_filter = ('created_on',)
    fields = ('name', 'domain_url', 'db_name', 'logo', 'address', 'phone', 'email', 'created_on')
    readonly_fields = ('db_name', 'created_on')
