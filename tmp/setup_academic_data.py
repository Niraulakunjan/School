import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('/Users/kunjan/sajiloschool')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_system.settings')
django.setup()

from academics.models import Class, Subject, ClassSubject, Section
from finance.models import FinancialYear
from django.utils import timezone

def setup():
    print("🚀 Starting Academic Quick-Start Setup...")
    
    # 1. Financial Year
    year, created = FinancialYear.objects.get_or_create(
        name="2081/82",
        defaults={
            'start_date': '2024-04-13',
            'end_date': '2025-04-12',
            'is_active': True
        }
    )
    if created: print(f"✅ Created Financial Year: {year.name}")
    else: print(f"ℹ️ Financial Year {year.name} already exists.")

    # 2. Class
    cls, created = Class.objects.get_or_create(
        name="Grade 11",
        faculty="Science",
        defaults={'order': 110}
    )
    if created: print(f"✅ Created Class: {cls}")
    else: print(f"ℹ️ Class {cls} already exists.")

    # 3. Sections
    for sname in ['A', 'B']:
        sec, created = Section.objects.get_or_create(class_obj=cls, name=sname)
        if created: print(f"✅ Created Section: {sec}")

    # 4. Subjects
    subjects_data = [
        # Name, Is Elective, Group, Order
        ("Compulsory English", False, "", 10),
        ("Compulsory Nepali", False, "", 20),
        ("Physics", False, "", 30),
        ("Chemistry", False, "", 40),
        ("Mathematics", True, "Group A (Math/Bio)", 50),
        ("Biology", True, "Group A (Math/Bio)", 60),
        ("Social Studies", True, "Group B (Social/Computer)", 70),
        ("Computer Science", True, "Group B (Social/Computer)", 80),
    ]

    for name, is_el, grp, order in subjects_data:
        sub, created = Subject.objects.get_or_create(
            name=name,
            defaults={
                'is_elective': is_el,
                'elective_group': grp,
                'order': order,
                'full_marks': 100,
                'pass_marks': 35
            }
        )
        if created: print(f"✅ Created Subject: {name}")

        # Assign to Class
        cs, created = ClassSubject.objects.get_or_create(
            class_obj=cls,
            subject=sub,
            defaults={
                'is_elective': is_el,
                'elective_group': grp,
                'full_marks': 100,
                'pass_marks': 35,
                'order': order
            }
        )
        if created: print(f"🔗 Linked {name} to {cls}")

    print("\n✨ Setup Complete! You can now test the elective selection in the Student Admission form.")

if __name__ == "__main__":
    setup()
