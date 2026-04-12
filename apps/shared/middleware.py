from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from tenants.models import SchoolTenant
from .utils import set_current_tenant, clear_current_tenant
import os

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to identify the tenant based on multiple strategies:
    1. Header: X-Tenant: <slug>
    2. Query Parameter: ?tenant=<slug>
    3. Subdomain detection relative to PLATFORM_DOMAIN
    """
    def process_request(self, request):
        clear_current_tenant()
        tenant_slug = None
        
        # 1. Try from Header (Highest Priority for API)
        tenant_slug = request.headers.get('X-Tenant')
        
        # 2. Try from Query Parameter
        if not tenant_slug:
            tenant_slug = request.GET.get('tenant')
            
        # 3. Try from Subdomain
        if not tenant_slug:
            host = request.get_host().split(':')[0].lower()
            platform_domain = os.environ.get('PLATFORM_DOMAIN', 'sajilocode.com').lower()
            
            # Identify if it's a subdomain of the platform
            if host.endswith(platform_domain) and host != platform_domain:
                # Extract the subdomain (e.g., school1.sajilocode.com -> school1)
                subdomain = host.replace(f".{platform_domain}", "")
                
                # Reserved system names that are NOT tenants
                reserved = ('www', 'apiscl', 'school', 'admin', 'pc', 'sc', 'localhost', '127')
                
                if subdomain not in reserved:
                    tenant_slug = subdomain

        if tenant_slug:
            try:
                # Lookup the tenant in the default database
                tenant = SchoolTenant.objects.using('default').get(domain_url=tenant_slug)
                set_current_tenant(tenant)
                request.tenant = tenant
            except SchoolTenant.DoesNotExist:
                request.tenant = None
        else:
            request.tenant = None

