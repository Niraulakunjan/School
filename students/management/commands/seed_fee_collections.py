import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from students.models import Student
from finance.models import FinancialYear, FeeStructure, StudentFeeEnrollment, FeeCollection
from apps.shared.utils import register_tenant_db, set_current_tenant
from tenants.models import SchoolTenant

class Command(BaseCommand):
    help = 'Seed random fee collections for existing students to test financial features'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=str, default='pc', help='Tenant domain_url (slug)')
        parser.add_argument('--count', type=int, default=200, help='Number of students to generate collections for')

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
        
        self.stdout.write(self.style.SUCCESS(f"Seeding fee collections in database: {db_name}"))

        months = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
        methods = ['cash', 'esewa', 'khalti', 'online']

        with transaction.atomic(using=db_name):
            # Get all active enrollments with related objects
            enrollments = list(StudentFeeEnrollment.objects.using(db_name).select_related('student', 'class_fee_detail', 'financial_year').filter(status='active'))
            
            if not enrollments:
                self.stdout.write(self.style.WARNING("No active enrollments found. Run seed_school_data first."))
                return

            sample_count = min(len(enrollments), options['count'])
            selected_enrollments = random.sample(enrollments, sample_count)

            self.stdout.write(f"Generating collections for {sample_count} students...")

            created_count = 0
            for enrollment in selected_enrollments:
                student = enrollment.student
                detail  = enrollment.class_fee_detail
                fy      = enrollment.financial_year
                
                num_payments = random.randint(1, 3)
                for i in range(num_payments):
                    month = months[i]
                    total_due = detail.total_amount
                    amount_paid = random.choice([total_due, total_due / 2, total_due - 500])
                    
                    receipt_no = f"REC-{random.randint(100000, 999999)}"
                    while FeeCollection.objects.using(db_name).filter(receipt_number=receipt_no).exists():
                        receipt_no = f"REC-{random.randint(100000, 999999)}"

                    FeeCollection.objects.using(db_name).create(
                        student=student,
                        class_fee_detail=detail,
                        enrollment=enrollment,
                        receipt_number=receipt_no,
                        financial_year=fy,
                        month=month,
                        amount_due=total_due,
                        amount_paid=amount_paid,
                        discount=random.choice([0, 100, 0]),
                        payment_method=random.choice(methods),
                        status='paid' if amount_paid >= total_due else 'partial',
                        payment_date=date.today() - timedelta(days=random.randint(0, 30)),
                        collected_by="Admin Seeder"
                    )
                    created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} hierarchical fee collection records."))
