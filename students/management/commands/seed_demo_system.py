import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from tenants.models import SchoolTenant
from apps.shared.utils import register_tenant_db, set_current_tenant
from students.models import Student
from academics.models import Class, Section, Subject, ClassSubject
from teachers.models import Teacher, StaffSalaryStructure
from finance.models import (
    FinancialYear, FeeStructure, ClassFeeDetail, FeeItem, 
    StudentFeeEnrollment, FeeCollection
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds a full school environment for demo purposes (200 students, 10 teachers, subjects, fees)'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default='demo', help='Tenant domain_url (slug)')
        parser.add_argument('--students', type=int, default=200, help='Number of students to seed')
        parser.add_argument('--teachers', type=int, default=10, help='Number of teachers to seed')

    def handle(self, *args, **options):
        tenant_slug = options['tenant']
        student_count = options['students']
        teacher_count = options['teachers']

        # 1. Setup/Create Tenant Record
        try:
            tenant, created = SchoolTenant.objects.using('default').get_or_create(
                domain_url=tenant_slug,
                defaults={
                    "name": tenant_slug.capitalize() + " Demo School",
                    "db_name": f"sajiloco_db_{tenant_slug}" # cPanel format
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created new tenant record: {tenant.name}"))
            
            register_tenant_db(tenant)
            set_current_tenant(tenant)
            db_name = tenant.db_name
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error setting up tenant {tenant_slug}: {e}"))
            return


        self.stdout.write(self.style.SUCCESS(f"🌱 Seeding Demo School: {tenant.name} ({db_name})"))

        first_names = ["Arjun", "Bina", "Chandra", "Deepa", "Esha", "Gaurav", "Hari", "Isha", "Jeevan", "Kiran", 
                       "Laxmi", "Manoj", "Nara", "Ojas", "Pooja", "Rojan", "Sita", "Tara", "Umesh", "Vivek"]
        last_names = ["Adhikari", "Bista", "Chaudhary", "Dahal", "Gurung", "Karki", "Lama", "Magar", "Shrestha", "Thapa"]

        with transaction.atomic(using=db_name):
            # 2. Cleanup
            self.stdout.write("Wiping existing records for a clean seed...")
            StudentFeeEnrollment.objects.using(db_name).all().delete()
            FeeCollection.objects.using(db_name).all().delete()
            Student.objects.using(db_name).all().delete()
            Teacher.objects.using(db_name).all().delete()
            ClassSubject.objects.using(db_name).all().delete()
            Subject.objects.using(db_name).all().delete()
            Section.objects.using(db_name).all().delete()
            Class.objects.using(db_name).all().delete()
            # Clean up associated users
            User.objects.db_manager(db_name).filter(role__in=[User.Role.STUDENT, User.Role.TEACHER]).delete()

            # 3. Academic Foundation
            fy, _ = FinancialYear.objects.using(db_name).get_or_create(
                name="2081/82",
                defaults={"start_date": date(2024, 4, 13), "end_date": date(2025, 4, 12), "is_active": True}
            )

            # Subjects
            core_subjects = ["Mathematics", "Science", "English", "Nepali", "Social Studies"]
            electives = [
                ("Optional Math", "Group A"), 
                ("Accountancy", "Group A"),
                ("Computer Science", "Group B"),
                ("Environment Science", "Group B")
            ]
            
            subject_objs = {}
            for s_name in core_subjects:
                sub, _ = Subject.objects.using(db_name).get_or_create(name=s_name, is_elective=False)
                subject_objs[s_name] = sub
                
            elective_objs = {}
            for s_name, group in electives:
                sub, _ = Subject.objects.using(db_name).get_or_create(name=s_name, is_elective=True, elective_group=group)
                elective_objs[s_name] = sub

            # Classes & Sections
            classes = []
            for i in range(1, 11):
                cls_name = f"{i}"
                cls, _ = Class.objects.using(db_name).get_or_create(name=cls_name, defaults={"order": i})
                classes.append(cls)
                for sec_name in ["A", "B"]:
                    Section.objects.using(db_name).get_or_create(class_obj=cls, name=sec_name)
                
                # Assign Subjects to Class
                for sub in subject_objs.values():
                    ClassSubject.objects.using(db_name).create(class_obj=cls, subject=sub)
                
                # Add Electives for Grade 9 & 10
                if i >= 9:
                    for sub in elective_objs.values():
                        ClassSubject.objects.using(db_name).create(class_obj=cls, subject=sub, is_elective=True, elective_group=sub.elective_group)

            # 4. Teachers (10)
            self.stdout.write(f"Generating {teacher_count} teachers...")
            for i in range(teacher_count):
                fn, ln = random.choice(first_names), random.choice(last_names)
                username = f"teacher_{i+1}"
                user = User.objects.db_manager(db_name).create_user(
                    username=username, password="password123", role=User.Role.TEACHER,
                    first_name=fn, last_name=ln, email=f"{username}@demo.com"
                )
                teacher = Teacher.objects.using(db_name).create(
                    user=user, employee_id=f"EMP-{1000+i}", post="Senior Teacher",
                    category="Teaching", gender="Male" if i % 2 == 0 else "Female",
                    mobile=f"98000000{i:02d}", job_start_date=date(2022, 1, 1)
                )
                StaffSalaryStructure.objects.using(db_name).create(staff=teacher, basic_salary=35000 + (i*1000))

            # 5. Finance Setup
            fs, _ = FeeStructure.objects.using(db_name).get_or_create(financial_year=fy, name="Standard Fees")
            
            class_fee_mappings = {}
            for cls in classes:
                detail = ClassFeeDetail.objects.using(db_name).create(fee_structure=fs, class_name=cls.name)
                class_fee_mappings[cls.name] = detail
                FeeItem.objects.using(db_name).create(structure_detail=detail, name="Tuition Fee", amount=2000 + (int(cls.name)*200), frequency="monthly")
                FeeItem.objects.using(db_name).create(structure_detail=detail, name="Exam Fee", amount=1000, frequency="quarterly")

            # 6. Students (200)
            self.stdout.write(f"Generating {student_count} students...")
            students_per_class = student_count // 10
            for cls in classes:
                for i in range(students_per_class):
                    fn, ln = random.choice(first_names), random.choice(last_names)
                    username = f"std_{cls.name}_{i+1}"
                    user = User.objects.db_manager(db_name).create_user(
                        username=username, password="password123", role=User.Role.STUDENT,
                        first_name=fn, last_name=ln
                    )
                    sec = "A" if i < (students_per_class // 2) else "B"
                    student = Student.objects.using(db_name).create(
                        user=user, admission_number=f"ADM-{cls.name}-{100+i}",
                        first_name=fn, last_name=ln, gender=random.choice(['M', 'F']),
                        date_of_birth=date(2010 + random.randint(0, 5), 1, 1),
                        class_name=cls.name, section=sec
                    )
                    # Enrollment
                    StudentFeeEnrollment.objects.using(db_name).create(
                        student=student, class_fee_detail=class_fee_mappings[cls.name],
                        financial_year=fy, class_name=cls.name, section=sec
                    )

        self.stdout.write(self.style.SUCCESS(f"✅ Successfully seeded {tenant.name} with 200 students, 10 teachers, and academic metadata."))
