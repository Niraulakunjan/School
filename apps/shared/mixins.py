from django.db import models
from django.conf import settings
from .utils import get_current_tenant

class TenantManager(models.Manager):
    """
    Manager that automatically filters queries by the current tenant in the context.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        tenant = get_current_tenant()
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset

class TenantMixin(models.Model):
    """
    Mixin for models that should be tenant-isolated.
    Adds a 'tenant' field and automatically filters queries.
    """
    tenant = models.ForeignKey(
        'tenants.SchoolTenant', 
        on_delete=models.CASCADE,
        related_name="%(class)s_records"
    )

    objects = TenantManager()
    plain_objects = models.Manager()  # Escape hatch to access all data

    class Meta:
        abstract = True
