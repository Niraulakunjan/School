from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
from students.models import Student
from teachers.models import Teacher
from utils.tenant_utils import get_current_tenant_db
import uuid

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    def get_fields(self):
        fields = super().get_fields()
        db = get_current_tenant_db()
        qs = User.objects.using(db)
        instance = getattr(self, 'instance', None)
        # instance could be a QuerySet when many=True, only exclude for single objects
        from django.db.models import QuerySet
        exclude_pk = getattr(instance, 'pk', None) if instance and not isinstance(instance, QuerySet) else None
        fields['username'].validators = [
            v for v in fields['username'].validators
            if not isinstance(v, UniqueValidator)
        ] + [UniqueValidator(queryset=qs.exclude(pk=exclude_pk) if exclude_pk else qs)]
        if 'email' in fields:
            fields['email'].validators = [
                v for v in fields['email'].validators
                if not isinstance(v, UniqueValidator)
            ] + [UniqueValidator(queryset=qs.exclude(pk=exclude_pk) if exclude_pk else qs)]
        return fields

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'password')
        read_only_fields = ('id',)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.get('role')
        db = get_current_tenant_db()
        user = User(**validated_data)
        user.set_password(password)
        user.save(using=db)

        if role == 'STUDENT':
            reg_no = f"ST-{uuid.uuid4().hex[:8].upper()}"
            Student.objects.using(db).create(
                user=user,
                registration_number=reg_no,
                date_of_birth="2010-01-01",
                guardian_name="Guardian",
                guardian_phone="0000000000"
            )
        elif role == 'TEACHER':
            emp_id = f"TC-{uuid.uuid4().hex[:8].upper()}"
            Teacher.objects.using(db).create(
                user=user,
                employee_id=emp_id,
                qualification="Degree Pending"
            )

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        db = get_current_tenant_db()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save(using=db)
        return instance
