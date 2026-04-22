from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import SchoolSetting
from .serializers import SchoolSettingSerializer
from utils.tenant_utils import get_current_tenant_db
from finance.models import FinancialYear

class SchoolSettingViewSet(viewsets.ViewSet):
    """
    A viewset to handle the singleton SchoolSetting record.
    GET will return the existing record or create a default one.
    POST will update the record.
    """
    def list(self, request):
        db = get_current_tenant_db()
        if db == 'default':
            return Response({'detail': 'Tenant context required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        setting, created = SchoolSetting.objects.using(db).get_or_create(id=1)
        serializer = SchoolSettingSerializer(setting, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        db = get_current_tenant_db()
        if db == 'default':
            return Response({'detail': 'Tenant context required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get existing or create default (id=1 is used as singleton)
        setting, _ = SchoolSetting.objects.using(db).get_or_create(id=1)
        
        serializer = SchoolSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        
        # Explicitly set querysets for ForeignKey fields to the tenant DB for validation
        if 'academic_year' in serializer.fields:
            serializer.fields['academic_year'].queryset = FinancialYear.objects.using(db).all()
        if 'fiscal_year' in serializer.fields:
            serializer.fields['fiscal_year'].queryset = FinancialYear.objects.using(db).all()

        if serializer.is_valid():
            # Save the serializer, then explicitly save the instance to the correct database
            instance = serializer.save()
            instance._state.db = db
            instance.save(using=db)
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
