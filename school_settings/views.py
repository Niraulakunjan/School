from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import SchoolSetting
from .serializers import SchoolSettingSerializer

class SchoolSettingViewSet(viewsets.ViewSet):
    """
    A viewset to handle the singleton SchoolSetting record.
    GET will return the existing record or create a default one.
    POST will update the record.
    """
    def list(self, request):
        setting, created = SchoolSetting.objects.get_or_create(id=1)
        # If created, maybe set a default name from the tenant?
        if created:
             # We can't easily get the tenant name here without the meta-db,
             # but django-tenants should have the current tenant name if it's set in the meta model.
             # For now, default is fine.
             pass
        serializer = SchoolSettingSerializer(setting, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        setting, _ = SchoolSetting.objects.get_or_create(id=1)
        serializer = SchoolSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
