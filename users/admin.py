from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Fieldsets for user editing
    fieldsets = UserAdmin.fieldsets + (
        ('Role Information', {'fields': ('role', 'phone_number', 'address')}),
    )
    # Fieldsets for user creation
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role Information', {'fields': ('role', 'phone_number', 'address')}),
    )
    # Fields to display in the list view
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    # Filter users in the admin list view by role and staff status
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    # Searchable fields
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)
