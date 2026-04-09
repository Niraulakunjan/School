from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SchoolTenant
from .serializers import SchoolTenantSerializer

class SchoolTenantViewSet(viewsets.ModelViewSet):
    queryset = SchoolTenant.objects.using('default').all()
    serializer_class = SchoolTenantSerializer

    @action(detail=False, methods=['get'])
    def current(self, request):
        tenant_header = request.headers.get('X-Tenant')
        if not tenant_header:
            host = request.get_host().split(':')[0]
            subdomain = host.split('.')[0]
            if subdomain not in ('localhost', '127', 'www'):
                tenant_header = subdomain
        
        if not tenant_header:
            return Response({"detail": "No tenant specified"}, status=400)

        try:
            tenant = SchoolTenant.objects.using('default').get(domain_url=tenant_header)
            serializer = self.get_serializer(tenant)
            return Response(serializer.data)
        except SchoolTenant.DoesNotExist:
            return Response({"detail": "Tenant not found"}, status=404)
