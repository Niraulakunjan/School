from django.contrib.auth.models import AbstractUser, UserManager as BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'SUPERUSER')
        return super().create_superuser(username, email, password, **extra_fields)

class User(AbstractUser):
    objects = UserManager()
    class Role(models.TextChoices):
        SUPERUSER = 'SUPERUSER', 'Superuser'
        ADMIN = 'ADMIN', 'Admin'
        TEACHER = 'TEACHER', 'Teacher'
        STUDENT = 'STUDENT', 'Student'
        PARENT = 'PARENT', 'Parent'
        STAFF = 'STAFF', 'Staff'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ADMIN
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
