import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from django.db import connections

from users.models import User
from students.models import Student
from tenants.models import SchoolTenant
from academics.models import Class, Section
from apps.shared.utils import set_current_tenant

class Command(BaseCommand):
    help = 'Seed 100 demo students for a specific tenant'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, help='The db_name of the tenant')

    def handle(self, *args, **options):
        tenant_db = options.get('tenant')
        if not tenant_db:
            self.stderr.write("Please provide a tenant db_name using --tenant")
            return

        try:
            tenant = SchoolTenant.objects.using('default').get(db_name=tenant_db)
        except SchoolTenant.DoesNotExist:
            self.stderr.write(f"Tenant with db_name '{tenant_db}' not found in 'default' database.")
            return

        self.stdout.write(f"Seeding 100 students for tenant: {tenant.name} ({tenant_db})")

        # Set context
        set_current_tenant(tenant)
        
        # Use the registered database alias (which is the db_name)
        db_alias = tenant.db_name
        
        fake = Faker()
        
        # Try to get classes and sections from the tenant DB
        try:
            classes = list(Class.objects.using(db_alias).all())
            sections = list(Section.objects.using(db_alias).all())
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not fetch classes/sections from {db_alias}: {e}"))
            classes = []
            sections = []

        count = 0
        for i in range(100):
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"{first_name.lower()}.{last_name.lower()}.{random.randint(100, 999)}"
            email = f"{username}@example.com"
            
            # Create User
            user = User.objects.using(db_alias).create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.STUDENT
            )
            user.set_password('password123')
            user.save(using=db_alias)
            
            # Student Info
            admission_number = f"ADM-{timezone.now().year}-{random.randint(1000, 9999)}"
            registration_number = f"REG-{random.randint(100000, 999999)}"
            
            dob = fake.date_of_birth(minimum_age=5, maximum_age=18)
            admission_date = timezone.now().date() - timedelta(days=random.randint(0, 365))
            
            gender = random.choice(['M', 'F'])
            blood_group = random.choice(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
            
            # Class/Section
            c_name = ""
            s_name = ""
            if classes:
                chosen_class = random.choice(classes)
                c_name = chosen_class.name
                # Filter sections for this class if possible
                class_sections = [s for s in sections if s.class_obj_id == chosen_class.id]
                if class_sections:
                    s_name = random.choice(class_sections).name
            else:
                c_name = f"Grade {random.randint(1, 10)}"
                s_name = random.choice(['A', 'B', 'C'])

            student = Student.objects.using(db_alias).create(
                user=user,
                admission_number=admission_number,
                registration_number=registration_number,
                roll_number=str(random.randint(1, 50)),
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                date_of_birth=dob,
                blood_group=blood_group,
                admission_date=admission_date,
                class_name=c_name,
                section=s_name,
                mobile_number=fake.phone_number()[:15],
                email=email,
                guardian_name=fake.name(),
                guardian_phone=fake.phone_number()[:15],
                guardian_relation=random.choice(['Father', 'Mother', 'Uncle', 'Aunt']),
                current_address=fake.address(),
                permanent_address=fake.address()
            )
            count += 1
            if count % 10 == 0:
                self.stdout.write(f"Created {count} students...")

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded 100 students for tenant {tenant_db}"))
