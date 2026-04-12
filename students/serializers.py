from rest_framework import serializers
from .models import Student, StudentDocument, StudentAttendance, SchoolHoliday

class StudentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDocument
        fields = ('id', 'doc_type', 'title', 'file', 'uploaded_at')
        read_only_fields = ('id', 'uploaded_at')

class StudentSerializer(serializers.ModelSerializer):
    documents = StudentDocumentSerializer(many=True, read_only=True)
    class_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = '__all__'
        read_only_fields = ('id', 'enrolled_at', 'user')

    def get_class_id(self, obj):
        from academics.models import Class
        from utils.tenant_utils import get_current_tenant_db
        db = get_current_tenant_db()
        try:
            cls = Class.objects.using(db).get(name=obj.class_name)
            return cls.id
        except Class.DoesNotExist:
            return None

class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField(read_only=True)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True)

    class Meta:
        model = StudentAttendance
        fields = ('id', 'student', 'student_name', 'admission_number', 'date', 'status', 'remark', 'updated_at')
        read_only_fields = ('id', 'updated_at', 'student_name', 'admission_number')

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip()

class SchoolHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolHoliday
        fields = ('id', 'date', 'title', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')
