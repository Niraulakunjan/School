from rest_framework import serializers
from .models import Class, Section, Subject, ClassSubject


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ('id', 'name', 'capacity', 'is_active')


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class ClassSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    class_name   = serializers.CharField(source='class_obj.name', read_only=True)
    faculty      = serializers.CharField(source='subject.faculty', read_only=True)

    class Meta:
        model = ClassSubject
        fields = '__all__'


class ClassSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    subjects = ClassSubjectSerializer(many=True, read_only=True)

    class Meta:
        model = Class
        fields = ('id', 'name', 'faculty', 'description', 'order', 'is_active', 'created_at', 'sections', 'subjects')
        read_only_fields = ('id', 'created_at')
