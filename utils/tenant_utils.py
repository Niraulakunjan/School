"""
Legacy utility for tenant context. 
Redirects to the new apps.shared.utils implementation.
"""
from apps.shared.utils import (
    set_current_tenant as set_shared_tenant,
    get_current_db,
    get_current_tenant
)

def set_current_tenant(tenant):
    """Sets the current tenant using the new contextvars implementation."""
    set_shared_tenant(tenant)

def get_current_tenant_db():
    """Returns the current database alias."""
    return get_current_db()

def get_current_tenant_domain():
    """Returns the current tenant's domain url."""
    tenant = get_current_tenant()
    return tenant.domain_url if tenant else None
