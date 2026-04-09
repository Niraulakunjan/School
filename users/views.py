from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from utils.tenant_utils import get_current_tenant_db
from apps.shared.utils import register_tenant_db
from tenants.models import SchoolTenant

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return User.objects.using(db)

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        if db == 'default':
            return Response(
                {'detail': 'X-Tenant header is required to create a user for a school.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        instance = User.objects.using(db).get(pk=kwargs['pk'])
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.pop('partial', False))
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        if db == 'default':
            return Response({'detail': 'X-Tenant header is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            instance = User.objects.using(db).get(pk=kwargs['pk'])
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='tenant-admin', permission_classes=[])
    def tenant_admin(self, request):
        domain = request.query_params.get('tenant')
        if not domain:
            return Response({'detail': 'tenant query param required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tenant = SchoolTenant.objects.using('default').get(domain_url=domain)
        except SchoolTenant.DoesNotExist:
            return Response({'detail': 'Tenant not found.'}, status=status.HTTP_404_NOT_FOUND)
        register_tenant_db(tenant)
        admins = User.objects.using(tenant.db_name).filter(role='ADMIN')
        return Response(UserSerializer(admins, many=True).data)
