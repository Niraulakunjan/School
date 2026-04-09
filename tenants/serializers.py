from rest_framework import serializers
from .models import SchoolTenant
import logging
from django.core.management import call_command
from django.db import connections
from utils.tenant_utils import set_current_tenant

logger = logging.getLogger(__name__)

class SchoolTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolTenant
        fields = ['id', 'name', 'domain_url', 'db_name', 'logo', 'address', 'phone', 'email', 'created_on']
        read_only_fields = ['db_name', 'created_on']

    def create(self, validated_data):
        name = validated_data['name']
        domain_url = validated_data['domain_url']
        db_name = f"db_{domain_url}"
        
        # Create the tenant record in the 'default' database
        # The 'auto_migrate_new_tenant' signal in signals.py will handle
        # provisioning the isolated DB automatically.
        tenant = SchoolTenant.objects.create(
            name=name,
            domain_url=domain_url,
            db_name=db_name
        )
        
        return tenant
