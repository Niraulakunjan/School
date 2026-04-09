from django.utils.deprecation import MiddlewareMixin
from tenants.models import SchoolTenant
from .utils import set_current_tenant, clear_current_tenant

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to identify the tenant based on multiple strategies:
    1. Header: X-Tenant: <slug>
    2. Query Parameter: ?tenant=<slug>
    3. Subdomain: <slug>.domain.com or <slug>.localhost
    """
    def process_request(self, request):
        # Clear any existing context
        clear_current_tenant()
        
        tenant_slug = None
        
        # 1. Try from Header
        tenant_slug = request.headers.get('X-Tenant')
        
        # 2. Try from Query Parameter
        if not tenant_slug:
            tenant_slug = request.GET.get('tenant')
            
        # 3. Try from Subdomain
        if not tenant_slug:
            host = request.get_host().split(':')[0]
            parts = host.split('.')
            if len(parts) > 1:
                subdomain = parts[0]
                # Exclude common subdomains/localhost
                if subdomain not in ('localhost', '127', 'www', 'pc', 'sc'):
                    tenant_slug = subdomain

        if tenant_slug:
            try:
                # Look up the tenant explicitly in the default database
                tenant = SchoolTenant.objects.using('default').get(domain_url=tenant_slug)
                set_current_tenant(tenant)
                # Attach tenant to request for easy access in views
                request.tenant = tenant
            except SchoolTenant.DoesNotExist:
                request.tenant = None
        else:
            request.tenant = None
