import random
from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from teachers.models import Teacher, StaffSalaryStructure
from school_system.middleware import setup_tenant_db

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed 5 demo teachers with profiles and salary structures'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default='db_pc', help='Tenant database name')

    def handle(self, *args, **options):
        db_name = options['tenant']
        try:
            setup_tenant_db(db_name)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error setting up database {db_name}: {e}"))
            return
        
        self.stdout.write(self.style.SUCCESS(f"Seeding teachers into: {db_name}"))

        names = [
            ("Surendra Bikram", "Prajapati", "Manager"),
            ("Prem P.", "Niraula", "Teacher"),
            ("Sailendra Kumar", "Bhattarai", "Teacher"),
            ("Tulsi Hari", "Prajapati", "Teacher"),
            ("Shiva Hari", "Prajapati", "Teacher"),
        ]

        with transaction.atomic(using=db_name):
            for i, (fname, lname, post) in enumerate(names):
                username = f"staff_{idx if 'idx' in locals() else i}_{random.randint(100, 999)}"
                email = f"{fname.lower().replace(' ', '.')}@demo.com"
                
                # Check if user exists
                if User.objects.db_manager(db_name).filter(username=username).exists():
                    continue

                user = User.objects.db_manager(db_name).create_user(
                    username=username,
                    email=email,
                    password="password123",
                    role=User.Role.TEACHER,
                    first_name=fname,
                    last_name=lname
                )

                teacher = Teacher.objects.using(db_name).create(
                    user=user,
                    employee_id=f"EMP-{100 + i}",
                    account_number=f"{i+1}",
                    post=post,
                    category="Teaching" if post == "Teacher" else "Administration",
                    gender=random.choice(["Male", "Female"]),
                    is_active_status="Active",
                    mobile=f"98{random.randint(10000000, 99999999)}",
                    job_start_date=date(2020, 1, 1)
                )

                # Create Salary Structure
                basic = 20000 + (i * 5000)
                StaffSalaryStructure.objects.using(db_name).create(
                    staff=teacher,
                    basic_salary=basic,
                    tiffin_allowance=1000,
                    special_allowance=500,
                    dashain_bonus=0,
                    other_allowance=200,
                    pf_add=basic * 0.1,
                    advance_add=0
                )

                self.stdout.write(self.style.SUCCESS(f"Created teacher: {fname} {lname}"))

        self.stdout.write(self.style.SUCCESS("Successfully seeded 5 demo teachers."))
