import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from students.models import Student
from academics.models import Class, Section
from finance.models import FinancialYear, FeeStructure, FeeItem, StudentFeeEnrollment
from apps.shared.utils import register_tenant_db, set_current_tenant
from tenants.models import SchoolTenant

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed 700 students across classes 1-10 with diverse faculties and fee enrollments'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default='pc', help='Tenant domain_url (slug)')

    def handle(self, *args, **options):
        tenant_slug = options['tenant']
        try:
            tenant = SchoolTenant.objects.using('default').get(domain_url=tenant_slug)
            register_tenant_db(tenant)
            set_current_tenant(tenant)
            db_name = tenant.db_name
        except SchoolTenant.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Tenant '{tenant_slug}' not found."))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error setting up tenant {tenant_slug}: {e}"))
            return
        
        self.stdout.write(self.style.SUCCESS(f"Seeding data into database: {db_name}"))

        first_names = ["Arjun", "Bina", "Chandra", "Deepa", "Esha", "Gaurav", "Hari", "Isha", "Jeevan", "Kiran", 
                       "Laxmi", "Manoj", "Nara", "Ojas", "Pooja", "Rojan", "Sita", "Tara", "Umesh", "Vivek",
                       "Aarav", "Ishaan", "Vihaan", "Aditya", "Sai", "Aryan", "Krishna", "Ram", "Bharat"]
        last_names = ["Adhikari", "Bista", "Chaudhary", "Dahal", "Gurung", "Karki", "Lama", "Magar", "Nepal", "Oli", 
                      "Panta", "Rai", "Shrestha", "Thapa", "Upreti", "Yadav", "Basnet", "Kharel", "Devkota", "Gaire"]

        with transaction.atomic(using=db_name):
            # 0. Cleanup existing data to avoid UNIQUE constraint errors
            self.stdout.write("Cleaning up existing student and enrollment data...")
            StudentFeeEnrollment.objects.using(db_name).all().delete()
            from finance.models import FeeCollection
            FeeCollection.objects.using(db_name).all().delete()
            students = Student.objects.using(db_name).all()
            user_ids = students.values_list('user_id', flat=True)
            students.delete()
            User.objects.db_manager(db_name).filter(id__in=user_ids).delete()
            
            # 1. Ensure Financial Year
            fy, _ = FinancialYear.objects.using(db_name).get_or_create(
                name="2081/82",
                defaults={
                    "start_date": date(2024, 4, 13),
                    "end_date": date(2025, 4, 12),
                    "is_active": True
                }
            )

            # 2. Create Classes and Sections
            sections_list = ["A", "B", "C"]
            created_classes = []
            for i in range(1, 11):
                cls_obj, _ = Class.objects.using(db_name).get_or_create(
                    name=str(i),
                    defaults={"order": i}
                )
                created_classes.append(cls_obj)
                for sec_name in sections_list:
                    Section.objects.using(db_name).get_or_create(
                        class_obj=cls_obj,
                        name=sec_name
                    )

            # 3. Create a single Fee Structure (Package) for the year
            from finance.models import FeeStructure, ClassFeeDetail, FeeItem
            main_fs, _ = FeeStructure.objects.using(db_name).get_or_create(
                financial_year=fy,
                name=f"Standard Fee Package {fy.name}",
                defaults={"description": "Standard school fee structure for all classes."}
            )

            # Create ClassFeeDetails within that package
            faculties = ["", "Science", "Management"]
            class_fee_details = {}
            
            for cls in created_classes:
                for fac in faculties:
                    if int(cls.name) < 9 and fac != "":
                        continue
                    
                    detail, _ = ClassFeeDetail.objects.using(db_name).get_or_create(
                        fee_structure=main_fs,
                        class_name=cls.name,
                        faculty=fac
                    )
                    class_fee_details[(cls.name, fac)] = detail
                    
                    # Add Fee Items to this detail
                    if not FeeItem.objects.using(db_name).filter(structure_detail=detail).exists():
                        FeeItem.objects.using(db_name).create(
                            structure_detail=detail, name="Tuition Fee", amount=3000 + (int(cls.name)*200), frequency="monthly"
                        )
                        FeeItem.objects.using(db_name).create(
                            structure_detail=detail, name="Exam Fee", amount=1500, frequency="quarterly"
                        )
                        if fac == "Science":
                            FeeItem.objects.using(db_name).create(
                                structure_detail=detail, name="Lab Fee", amount=1000, frequency="monthly"
                            )

            # 4. Generate 700 Students
            total_students_to_create = 700
            students_per_class = total_students_to_create // 10
            
            self.stdout.write(f"Generating approximately {total_students_to_create} students...")
            
            created_count = 0
            for cls in created_classes:
                self.stdout.write(f"Processing Class {cls.name}...")
                for i in range(students_per_class):
                    fname = random.choice(first_names)
                    lname = random.choice(last_names)
                    username = f"std_{cls.name}_{i}_{random.randint(1000, 9999)}"
                    
                    while User.objects.db_manager(db_name).filter(username=username).exists():
                         username = f"std_{cls.name}_{i}_{random.randint(1000, 9999)}"

                    user = User.objects.db_manager(db_name).create_user(
                        username=username, password="password123",
                        role=User.Role.STUDENT, first_name=fname, last_name=lname
                    )
                    
                    sec = random.choice(sections_list)
                    fac = ""
                    if int(cls.name) >= 9:
                        fac = random.choice(["Science", "Management"])
                    
                    student = Student.objects.using(db_name).create(
                        user=user,
                        admission_number=f"ADM-{cls.name}-{i}-{random.randint(100, 999)}",
                        registration_number=f"REG-{random.randint(100000, 999999)}",
                        first_name=fname, last_name=lname,
                        gender=random.choice(['M', 'F']),
                        date_of_birth=date(2010 + random.randint(0, 5), random.randint(1,12), random.randint(1,28)),
                        class_name=cls.name, section=sec,
                        guardian_name=f"{fname}'s Guardian",
                        guardian_phone=f"98{random.randint(10000000, 99999999)}"
                    )
                    
                    # 5. Enroll in Fee Detail
                    detail = class_fee_details.get((cls.name, fac))
                    if detail:
                        if not StudentFeeEnrollment.objects.using(db_name).filter(student=student, financial_year=fy).exists():
                            StudentFeeEnrollment.objects.using(db_name).create(
                                student=student,
                                class_fee_detail=detail,
                                financial_year=fy,
                                class_name=cls.name,
                                section=sec,
                                status='active'
                            )
                    
                    created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} students and their hierarchical enrollments."))

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} students and their enrollments."))
