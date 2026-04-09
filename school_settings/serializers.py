from rest_framework import serializers
from .models import SchoolSetting

class SchoolSettingSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.SerializerMethodField()
    fiscal_year_name   = serializers.SerializerMethodField()

    class Meta:
        model = SchoolSetting
        fields = '__all__'

    def get_academic_year_name(self, obj):
        return obj.academic_year.name if obj.academic_year else None

    def get_fiscal_year_name(self, obj):
        return obj.fiscal_year.name if obj.fiscal_year else None
