from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from .models import (
    FeeStructure, ClassFeeDetail, FeeCollection, StudentFeeEnrollment, 
    FinancialYear, Expense, BusRoute, ElectiveSubjectFee,
    SchoolIncome, SchoolExpenditure, MonthlyDemand, PreviousYearDue,
    FeeDiscount, StudentDiscount
)
from .serializers import (
    FeeStructureSerializer, FeeCollectionSerializer,
    StudentFeeEnrollmentSerializer, FinancialYearSerializer, 
    ExpenseSerializer, BusRouteSerializer, ElectiveSubjectFeeSerializer,
    SchoolIncomeSerializer, SchoolExpenditureSerializer,
    FeeDiscountSerializer, StudentDiscountSerializer
)
from utils.tenant_utils import get_current_tenant_db, get_current_tenant_domain


class FinancialYearViewSet(viewsets.ModelViewSet):
    queryset = FinancialYear.objects.all()
    serializer_class = FinancialYearSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return FinancialYear.objects.using(db).all()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Cannot delete this financial year because it contains active student enrollments or fee structures. Please remove them first."},
                status=status.HTTP_400_BAD_REQUEST
            )




class BusRouteViewSet(viewsets.ModelViewSet):
    queryset = BusRoute.objects.all()
    serializer_class = BusRouteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return BusRoute.objects.using(db).all()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()



class FeeStructureViewSet(viewsets.ModelViewSet):
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = FeeStructure.objects.using(db).prefetch_related('class_details', 'class_details__items').select_related('financial_year')
        year = self.request.query_params.get('financial_year')
        if year:
            qs = qs.filter(financial_year_id=year)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


    @action(detail=False, methods=['get'], url_path='years')
    def years(self, request):
        db = get_current_tenant_db()
        years = FinancialYear.objects.using(db).all().order_by('-start_date')
        return Response(FinancialYearSerializer(years, many=True).data)


class StudentFeeEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentFeeEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = StudentFeeEnrollment.objects.using(db).select_related('student', 'class_fee_detail', 'class_fee_detail__fee_structure', 'financial_year')
        
        for param in ('financial_year', 'status', 'class_name'):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})

        student = self.request.query_params.get('student')
        if student:
            qs = qs.filter(student_id=student)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        month = self.request.query_params.get('month')
        if month:
            context['up_to_month'] = month
        return context

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        data = request.data.copy()

        # Prevent duplicate enrollment
        exists = StudentFeeEnrollment.objects.using(db).filter(
            student_id=data.get('student'),
            class_fee_detail_id=data.get('class_fee_detail'),
            financial_year_id=data.get('financial_year'),
        ).exists()
        if exists:
            return Response(
                {'detail': 'Student is already enrolled in this fee structure for this financial year.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Auto-fill class/section from student if not provided
        if not data.get('class_name') or not data.get('section'):
            from students.models import Student
            try:
                student = Student.objects.using(db).get(pk=data.get('student'))
                if not data.get('class_name'):
                    data['class_name'] = student.class_name
                if not data.get('section'):
                    data['section'] = student.section
            except Student.DoesNotExist:
                pass

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        enrollment = serializer.save()
        
        # Sync elective subjects to student record
        elective_ids = request.data.getlist('elective_subjects')
        if elective_ids:
            enrollment.student.elective_subjects.set(elective_ids)
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """Mark a student's enrollment as completed (section/year done)."""
        db = get_current_tenant_db()
        enrollment = self.get_object()
        if enrollment.status == 'completed':
            return Response({'detail': 'Already completed.'}, status=status.HTTP_400_BAD_REQUEST)
        enrollment.status = 'completed'
        enrollment.completed_at = timezone.now()
        enrollment.notes = request.data.get('notes', enrollment.notes)
        enrollment.save(using=db)
        return Response(self.get_serializer(enrollment).data)

    @action(detail=False, methods=['post'], url_path='bulk-complete')
    def bulk_complete(self, request):
        """Mark multiple enrollments as completed."""
        db = get_current_tenant_db()
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'detail': 'No IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = StudentFeeEnrollment.objects.using(db).filter(
            pk__in=ids, status='active'
        ).update(status='completed', completed_at=timezone.now())
        return Response({'updated': updated})

    @action(detail=False, methods=['post'], url_path='bulk-promote')
    def bulk_promote(self, request):
        """
        Bulk promote students to a new academic year.
        Uses a top-level FeeStructure and auto-resolves ClassFeeDetail for each student's new class.
        """
        db = get_current_tenant_db()
        student_ids      = request.data.get('student_ids', [])
        new_year_id      = request.data.get('financial_year')
        new_structure_id = request.data.get('fee_structure')
        new_class        = request.data.get('class_name', '')
        new_section      = request.data.get('section', '')
        faculty          = request.data.get('faculty', '') # Optional faculty refinement
        elective_ids     = request.data.getlist('elective_subjects')

        if not student_ids or not new_year_id or not new_structure_id:
            return Response(
                {'detail': 'student_ids, financial_year and fee_structure are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            structure = FeeStructure.objects.using(db).get(pk=new_structure_id)
        except FeeStructure.DoesNotExist:
            return Response({'detail': 'Fee structure not found.'}, status=status.HTTP_404_NOT_FOUND)

        from students.models import Student
        created, skipped = 0, 0
        
        # Pre-resolve class details to avoid N+1 queries in the loop
        # We'll need to resolve per-student if they have different classes, 
        # but bulk promote usually targets one class -> another class.
        # If new_class is provided, we use it for all. If not, we use student.class_name.
        
        cache_details = {} # (class_name, faculty) -> ClassFeeDetail

        for sid in student_ids:
            try:
                student = Student.objects.using(db).get(pk=sid)
            except Student.DoesNotExist:
                skipped += 1
                continue

            target_class = new_class or student.class_name
            target_faculty = faculty or getattr(student, 'faculty', '') # Faculty might not be on model yet, but let's assume class_name is enough or refined
            
            detail_key = (target_class, target_faculty)
            if detail_key not in cache_details:
                detail = ClassFeeDetail.objects.using(db).filter(
                    fee_structure=structure, 
                    class_name=target_class,
                    faculty=target_faculty
                ).first()
                if not detail and target_faculty: # Fallback to no faculty if specific faculty not found
                    detail = ClassFeeDetail.objects.using(db).filter(
                        fee_structure=structure, 
                        class_name=target_class,
                        faculty=''
                    ).first()
                cache_details[detail_key] = detail
            
            detail = cache_details[detail_key]
            if not detail:
                skipped += 1
                continue

            # Skip if already enrolled for this year + class detail
            if StudentFeeEnrollment.objects.using(db).filter(
                student=student, class_fee_detail=detail, financial_year_id=new_year_id
            ).exists():
                skipped += 1
                continue

            # Calculate balance before closing old enrollment
            active_enrollments = StudentFeeEnrollment.objects.using(db).filter(
                student=student, status='active'
            )
            for old_e in active_enrollments:
                closing_balance = old_e.balance
                if closing_balance > 0:
                    PreviousYearDue.objects.using(db).update_or_create(
                        student=student, 
                        financial_year_id=new_year_id,
                        defaults={'opening_balance': closing_balance}
                    )
            
            # Mark old active enrollment as completed
            active_enrollments.update(status='completed', completed_at=timezone.now())

            # Create new enrollment
            StudentFeeEnrollment.objects.using(db).create(
                student=student,
                class_fee_detail=detail,
                financial_year_id=new_year_id,
                class_name=target_class,
                section=new_section or student.section,
                status='active',
            )

            # Update student's current class/section
            if new_class:
                student.class_name = new_class
            if new_section:
                student.section = new_section
            
            # Sync electives during promotion
            if elective_ids:
                student.elective_subjects.set(elective_ids)
                
            student.save(using=db)
            created += 1

        return Response({'created': created, 'skipped': skipped})

    @action(detail=False, methods=['post'], url_path='bulk-enroll-class')
    def bulk_enroll_class(self, request):
        """Auto-resolves ClassFeeDetail from a top-level FeeStructure and class_name."""
        db = get_current_tenant_db()
        class_name     = request.data.get('class_name')
        section        = request.data.get('section')
        year_id        = request.data.get('financial_year')
        structure_id   = request.data.get('fee_structure')
        faculty        = request.data.get('faculty', '')
        elective_ids   = request.data.getlist('elective_subjects')

        if not class_name or not year_id or not structure_id:
            return Response(
                {'detail': 'class_name, financial_year and fee_structure are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the specific detail for this class
        detail = ClassFeeDetail.objects.using(db).filter(
            fee_structure_id=structure_id,
            class_name=class_name,
            faculty=faculty
        ).first() or ClassFeeDetail.objects.using(db).filter(
            fee_structure_id=structure_id,
            class_name=class_name
        ).first()

        if not detail:
            return Response({'detail': f'No fee details found for Class {class_name} in the selected structure.'}, status=status.HTTP_404_NOT_FOUND)

        from students.models import Student
        target_students = Student.objects.using(db).filter(class_name=class_name)
        if section:
            target_students = target_students.filter(section=section)

        created, skipped = 0, 0
        for student in target_students:
            if StudentFeeEnrollment.objects.using(db).filter(
                student=student, class_fee_detail=detail, financial_year_id=year_id
            ).exists():
                skipped += 1
                continue

            StudentFeeEnrollment.objects.using(db).create(
                student=student,
                class_fee_detail=detail,
                financial_year_id=year_id,
                class_name=student.class_name,
                section=student.section,
                status='active',
            )

            # Sync electives during bulk enrollment
            if elective_ids:
                student.elective_subjects.set(elective_ids)

            created += 1

        return Response({'created': created, 'skipped': skipped})

    @action(detail=False, methods=['get'], url_path='report')
    def report(self, request):
        """Export a CSV report of student fees, dues, and collections."""
        from django.http import HttpResponse
        import csv
        
        db = get_current_tenant_db()
        qs = self.get_queryset() # This respects existing filters via query params
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="fee_report_{timezone.now().strftime("%Y%m%d_%H%M")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Student Name', 'Admission #', 'Class', 'Section', 'Package Name', 'Year', 'Total Due', 'Collected', 'Remaining Balance'])
        
        for e in qs:
            writer.writerow([
                f"{e.student.first_name} {e.student.last_name}",
                getattr(e.student, 'admission_number', 'N/A'),
                e.class_name,
                e.section,
                e.class_fee_detail.fee_structure.name,
                e.financial_year.name if e.financial_year else 'N/A',
                e.total_due,
                e.total_paid,
                e.balance
            ])
            
        return response

    def _generate_monthly_demands(self, db, enrollments, month_idx):
        """Helper to generate/update MonthlyDemand records for a set of enrollments."""
        from .models import MonthlyDemand, StudentDiscount
        created_count = 0
        for e in enrollments:
            total = 0
            eligible_items = []
            
            # 1. Start with Flexible FeeItems
            # This is now the ONLY way to charge students. 
            # If they want Tuition, it must be an item in ClassFeeDetail with frequency 'monthly' or specific months.
            for item in e.class_fee_detail.items.using(db).all():
                months = [m.strip() for m in item.billing_months.split(',')]
                if str(month_idx) in months:
                    eligible_items.append({
                        'id': item.id,
                        'name': item.name,
                        'amount': float(item.amount)
                    })
                    total += float(item.amount)

            # 2. Add Elective Subject Fees
            # Check which subjects this student is enrolled in that have specific fees
            enrolled_subject_ids = e.student.elective_subjects.values_list('id', flat=True)
            if enrolled_subject_ids:
                elective_fees = ElectiveSubjectFee.objects.using(db).filter(
                    class_obj=e.class_fee_detail.class_name, # Match by class name if needed, or by class_obj_id
                    subject_id__in=enrolled_subject_ids
                )
                # Note: class_obj in ElectiveSubjectFee is a ForeignKey to academics.Class.
                # enrollment.class_name is a CharField. We should match by the actual class object if possible.
                # Let's refine the query to be precise.
                from academics.models import Class
                c_obj = Class.objects.using(db).filter(name=e.class_name).first()
                if c_obj:
                    elective_fees = ElectiveSubjectFee.objects.using(db).filter(
                        class_obj=c_obj,
                        subject_id__in=enrolled_subject_ids
                    )
                    for ef in elective_fees:
                        eligible_items.append({
                            'id': f"elective-{ef.id}",
                            'name': ef.fee_name or f"{ef.subject.name} Fee",
                            'amount': float(ef.amount)
                        })
                        total += float(ef.amount)

            # 3. Apply Student Discounts
            active_discounts = StudentDiscount.objects.using(db).filter(
                student=e.student, 
                financial_year=e.financial_year,
                is_active=True
            ).select_related('discount')
            
            for ad in active_discounts:
                d = ad.discount
                discount_val = 0
                if d.discount_type == 'percentage':
                    # Policy choice: Discount applied to the total (Base + Electives)
                    discount_val = (total * float(d.value)) / 100
                else:
                    discount_val = float(d.value)
                
                if discount_val > 0:
                    eligible_items.append({
                        'id': f"disc-{d.id}",
                        'name': f"Discount: {d.name}",
                        'amount': -abs(discount_val)
                    })
                    total -= discount_val

            # 4. Save Logic: Smart Incremental Update (Merge)
            demand, demand_created = MonthlyDemand.objects.using(db).get_or_create(
                student=e.student,
                financial_year=e.financial_year,
                month=month_idx,
                defaults={
                    'total_amount': Decimal('0.00'),
                    'fee_items_json': {'items': []}
                }
            )

            if not demand_created:
                # Merge Logic: Only add items that are missing by name
                current_items = demand.fee_items_json.get('items', [])
                current_names = {it['name'] for it in current_items}
                
                merged_count = 0
                for new_it in eligible_items:
                    if new_it['name'] not in current_names:
                        current_items.append(new_it)
                        merged_count += 1
                
                if merged_count > 0:
                    # Recalculate total from merged list
                    new_total = sum(Decimal(str(it['amount'])) for it in current_items)
                    demand.total_amount = max(Decimal('0.00'), new_total)
                    demand.fee_items_json = {'items': current_items}
                    demand.save(using=db)
            else:
                # New record: Set full calculated snapshot
                demand.total_amount = Decimal(str(max(0, total)))
                demand.fee_items_json = {'items': eligible_items}
                demand.save(using=db)
            
            created_count += 1
        return created_count

    @action(detail=False, methods=['post'], url_path='generate-monthly-demands')
    def generate_monthly_demands(self, request):
        db = get_current_tenant_db()
        month_idx = request.data.get('month')
        year_id = request.data.get('financial_year')

        if not month_idx or not year_id:
            return Response({'detail': 'month and financial_year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        enrollments = StudentFeeEnrollment.objects.using(db).filter(
            financial_year_id=year_id,
            status='active'
        ).select_related('student', 'class_fee_detail')

        count = self._generate_monthly_demands(db, enrollments, month_idx)
        return Response({'detail': f'Generated {count} demands.'})

    @action(detail=False, methods=['post'], url_path='bulk-generate')
    def bulk_generate(self, request):
        """
        Auto-enrolls students in a class (or all classes) and generates fees for a month (or all months).
        Body: { "class_name": "10" or "All", "month": 2 or "All", "financial_year": 1 }
        """
        from students.models import Student
        from .models import ClassFeeDetail
        db = get_current_tenant_db()
        
        class_name_input = request.data.get('class_name')
        month_input      = request.data.get('month') # e.g. "All" or a number
        year_id          = request.data.get('financial_year')

        if not all([class_name_input, month_input, year_id]):
            return Response({'detail': 'class_name, month, and financial_year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Decide which classes to process
        if class_name_input == 'All':
            target_classes = Student.objects.using(db).values_list('class_name', flat=True).distinct()
            target_classes = [c for c in target_classes if c]
        else:
            target_classes = [class_name_input]

        # Decide which months to process
        if month_input == 'All':
            target_months = range(1, 13)
        else:
            target_months = [int(month_input)]

        overall_stats = {
            'total_students_found': 0,
            'total_students_billed': 0,
            'total_demands_created': 0,
            'classes_processed': [],
            'skipped_classes': [],
            'months_processed_count': len(target_months)
        }

        # Cache unique students per class to avoid re-querying in the month loop
        student_map = {}
        for class_name in target_classes:
            students = Student.objects.using(db).filter(class_name=class_name)
            if not students.exists():
                continue
                
            overall_stats['total_students_found'] += students.count()
            
            # Check for Fee Structure
            default_detail = ClassFeeDetail.objects.using(db).filter(
                class_name=class_name,
                fee_structure__financial_year_id=year_id,
                fee_structure__is_active=True
            ).first()

            if not default_detail:
                overall_stats['skipped_classes'].append(class_name)
                continue

            student_map[class_name] = students
            overall_stats['total_students_billed'] += students.count()
            overall_stats['classes_processed'].append(class_name)
            
            # Auto-enroll missing students (only once per student/year)
            for s in students:
                StudentFeeEnrollment.objects.using(db).get_or_create(
                    student=s,
                    financial_year_id=year_id,
                    defaults={
                        'class_fee_detail': default_detail,
                        'class_name': s.class_name,
                        'section': s.section,
                        'status': 'active'
                    }
                )

        # Process Month by Month
        for m_idx in target_months:
            for class_name in overall_stats['classes_processed']:
                enrollments = StudentFeeEnrollment.objects.using(db).filter(
                    financial_year_id=year_id,
                    class_name=class_name,
                    status='active'
                ).select_related('student', 'class_fee_detail')

                count = self._generate_monthly_demands(db, enrollments, m_idx)
                overall_stats['total_demands_created'] += count

        return Response({
            'detail': f"Bulk process complete for {len(overall_stats['classes_processed'])} classes.",
            'students_found': overall_stats['total_students_found'],
            'students_billed': overall_stats['total_students_billed'],
            'demands_generated': overall_stats['total_demands_created'],
            'classes': overall_stats['classes_processed'],
            'skipped_classes': overall_stats['skipped_classes'],
            'months_billed': len(target_months)
        })





    @action(detail=True, methods=['get'], url_path='ledger')
    def ledger(self, request, pk=None):
        """Returns the full billing ledger for a specific enrollment."""
        db = get_current_tenant_db()
        enrollment = self.get_object()
        student = enrollment.student
        year = enrollment.financial_year

        # 1. Previous Year Dues
        prev_due_obj = PreviousYearDue.objects.using(db).filter(
            student=student, financial_year=year
        ).first()

        # 2. Monthly Demands
        demands = MonthlyDemand.objects.using(db).filter(
            student=student, financial_year=year
        ).order_by('month')

        # 3. Monthly Breakdown
        nepali_months = [
            "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashoj",
            "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
        ]
        
        breakdown = []
        item_groups = {} # item_name -> { total, paid, start, end }

        for d in demands:
            m_idx = d.month
            m_name = nepali_months[m_idx-1] if 0 < m_idx <= 12 else f"Month {m_idx}"
            
            # Detailed breakdown for timeline
            breakdown.append({
                'month_idx': m_idx,
                'month_name': m_name,
                'demand': float(d.total_amount),
                'paid': float(d.amount_paid),
                'status': d.get_status_display(),
                'items': d.fee_items_json.get('items', [])
            })


            # Aggregate for grouped summary
            items = d.fee_items_json.get('items', [])
            for it in items:
                name = it['name']
                if name not in item_groups:
                    item_groups[name] = {
                        'total': 0,
                        'start_idx': m_idx,
                        'end_idx': m_idx
                    }
                item_groups[name]['total'] += it['amount']
                item_groups[name]['start_idx'] = min(item_groups[name]['start_idx'], m_idx)
                item_groups[name]['end_idx'] = max(item_groups[name]['end_idx'], m_idx)

        # Build human-readable grouped summary
        grouped_summary = []
        for name, info in item_groups.items():
            start_name = nepali_months[info['start_idx']-1]
            end_name = nepali_months[info['end_idx']-1]
            range_label = f"({start_name} - {end_name})" if info['start_idx'] != info['end_idx'] else f"({start_name})"
            
            grouped_summary.append({
                'name': name,
                'range': range_label,
                'total': float(info['total']),
            })

        # 4. Final Summary
        from django.db.models import Sum
        summary = {
            'previous_year_dues': float(prev_due_obj.opening_balance) if prev_due_obj else 0.0,
            'previous_year_paid': float(prev_due_obj.amount_paid) if prev_due_obj else 0.0,
            'current_year_total_demand': float(demands.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'current_year_total_paid': float(demands.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0),
            'net_balance': float(enrollment.balance)
        }

        return Response({
            'student_name': student.full_name,
            'summary': summary,
            'monthly_breakdown': breakdown
        })


class FeeCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = FeeCollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = FeeCollection.objects.using(db).select_related('student', 'class_fee_detail', 'class_fee_detail__fee_structure', 'enrollment', 'financial_year')
        for param in ('financial_year', 'status', 'payment_method'):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        student = self.request.query_params.get('student')
        if student:
            qs = qs.filter(student_id=student)
        return qs

    @action(detail=False, methods=['post'], url_path='clear-all')
    def clear_all_data(self, request):
        """DESTRUCTIVE: Deletes all demand and collection history."""
        db = get_current_tenant_db()
        from .models import MonthlyDemand, FeeCollection, PreviousYearDue
        
        # 1. Clear Payments
        FeeCollection.objects.using(db).all().delete()
        
        # 2. Clear Monthly Demands (Invoices)
        MonthlyDemand.objects.using(db).all().delete()
        
        # 3. Clear Previous Year Dues (Carry overs)
        PreviousYearDue.objects.using(db).all().delete()
        
        return Response({'detail': 'All financial collection and demand records have been cleared.'})


    def _generate_receipt(self, db):
        domain = get_current_tenant_domain() or 'SCH'
        prefix = f"{domain.upper()}-RCP-"
        
        # Find the latest receipt to get the starting count
        last_receipt = FeeCollection.objects.using(db).filter(receipt_number__startswith=prefix).order_by('-id').first()
        
        if not last_receipt:
            next_num = 1
        else:
            import re
            match = re.search(r'(\d+)$', last_receipt.receipt_number)
            if match:
                next_num = int(match.group(1)) + 1
            else:
                next_num = last_receipt.id + 1
        
        # Double check for collision and increment if necessary
        while True:
            candidate = f"{prefix}{str(next_num).zfill(5)}"
            if not FeeCollection.objects.using(db).filter(receipt_number=candidate).exists():
                return candidate
            next_num += 1

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        data = request.data.copy()

        student_id = data.get('student')
        year_id = data.get('financial_year')
        total_paying = float(data.get('amount_paid', 0))
        
        if not student_id or not year_id or total_paying <= 0:
            return super().create(request, *args, **kwargs)

        # FIFO Allocation Logic
        remaining = total_paying
        allocation_log = []

        # 1. Allocate to Previous Year Dues
        prev_due = PreviousYearDue.objects.using(db).filter(
            student_id=student_id, financial_year_id=year_id
        ).first()
        
        if prev_due and prev_due.balance > 0 and remaining > 0:
            can_pay = min(remaining, float(prev_due.balance))
            prev_due.amount_paid += Decimal(str(can_pay))
            prev_due.save(using=db)
            remaining -= can_pay
            allocation_log.append(f"Paid Rs. {can_pay} towards Previous Year Dues")

        # 2. Allocate to Monthly Demands (Arrears First)
        if remaining > 0:
            demands = MonthlyDemand.objects.using(db).filter(
                student_id=student_id, financial_year_id=year_id
            ).exclude(status='paid').order_by('month')
            
            for d in demands:
                if remaining <= 0: break
                due = float(d.balance)
                can_pay = min(remaining, due)
                d.amount_paid += Decimal(str(can_pay))
                
                # Update status
                if d.amount_paid >= d.total_amount:
                    d.status = 'paid'
                elif d.amount_paid > 0:
                    d.status = 'partial'
                
                d.save(using=db)
                remaining -= can_pay
                
                nepali_months = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
                m_name = nepali_months[d.month-1] if 0 < d.month <= 12 else f"month {d.month}"
                allocation_log.append(f"Paid Rs. {can_pay} towards {m_name} dues")

        # Log allocation in remarks
        if allocation_log:
            data['remarks'] = (data.get('remarks', '') + "\n" + "\n".join(allocation_log)).strip()

        # Final Collection Record
        receipt_num = self._generate_receipt(db)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(receipt_number=receipt_num)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        db = get_current_tenant_db()
        qs = FeeCollection.objects.using(db)
        year = request.query_params.get('financial_year')
        if year:
            qs = qs.filter(financial_year_id=year)
        data = qs.aggregate(
            total_due=Sum('amount_due'), total_paid=Sum('amount_paid'),
            total_discount=Sum('discount'), total_fine=Sum('fine'), total_records=Count('id'),
        )
        for k in ('total_due', 'total_paid', 'total_discount', 'total_fine'):
            data[k] = float(data[k] or 0)
        data['total_balance'] = data['total_due'] - data['total_paid'] - data['total_discount'] + data['total_fine']
        return Response(data)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = Expense.objects.using(db).select_related('financial_year')
        for param in ('financial_year', 'category', 'payment_method'):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        return qs


    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        db = get_current_tenant_db()
        qs = Expense.objects.using(db)
        year = request.query_params.get('financial_year')
        if year:
            qs = qs.filter(financial_year_id=year)
            
        data = qs.aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id')
        )
        
        # Category breakdown
        categories = qs.values('category').annotate(total=Sum('amount')).order_by('-total')
        
        return Response({
            'total_amount': float(data['total_amount'] or 0),
            'total_count': data['total_count'],
            'categories': categories
        })

    @action(detail=False, methods=['get'], url_path='finance-overview')
    def finance_overview(self, request):
        """
        School finance overview: income (fee collections) vs expenditure (expenses).
        Params: financial_year (optional), from_date, to_date
        Returns: totals, net balance, monthly trend, expense category breakdown,
                 recent transactions (both income and expense).
        """
        from django.db.models.functions import TruncMonth
        from itertools import chain
        import datetime

        db         = get_current_tenant_db()
        year_id    = request.query_params.get('financial_year')
        from_date  = request.query_params.get('from_date')
        to_date    = request.query_params.get('to_date')

        # ── Income (FeeCollection) ──────────────────────────────────────────
        income_qs = FeeCollection.objects.using(db).all()
        if year_id:
            income_qs = income_qs.filter(financial_year_id=year_id)
        if from_date:
            income_qs = income_qs.filter(payment_date__gte=from_date)
        if to_date:
            income_qs = income_qs.filter(payment_date__lte=to_date)

        income_agg = income_qs.aggregate(
            total=Sum('amount_paid'),
            count=Count('id'),
        )
        total_income = float(income_agg['total'] or 0)

        # Monthly income
        monthly_income = (
            income_qs
            .annotate(trunc_month=TruncMonth('payment_date'))
            .values('trunc_month')
            .annotate(total=Sum('amount_paid'))
            .order_by('trunc_month')
        )

        # Payment method breakdown for income
        income_by_method = (
            income_qs
            .values('payment_method')
            .annotate(total=Sum('amount_paid'))
            .order_by('-total')
        )

        # ── Expenditure (Expense) ──────────────────────────────────────────
        exp_qs = Expense.objects.using(db).all()
        if year_id:
            exp_qs = exp_qs.filter(financial_year_id=year_id)
        if from_date:
            exp_qs = exp_qs.filter(date__gte=from_date)
        if to_date:
            exp_qs = exp_qs.filter(date__lte=to_date)

        exp_agg = exp_qs.aggregate(
            total=Sum('amount'),
            count=Count('id'),
        )
        total_expense = float(exp_agg['total'] or 0)

        # Monthly expense
        monthly_expense = (
            exp_qs
            .annotate(trunc_month=TruncMonth('date'))
            .values('trunc_month')
            .annotate(total=Sum('amount'))
            .order_by('trunc_month')
        )

        # Expense category breakdown
        exp_categories = (
            exp_qs
            .values('category')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )

        # ── Build unified monthly trend ─────────────────────────────────────
        month_map = {}
        for rec in monthly_income:
            key = rec['trunc_month'].strftime('%Y-%m')
            month_map.setdefault(key, {'month': key, 'income': 0, 'expense': 0})
            month_map[key]['income'] = float(rec['total'] or 0)
        for rec in monthly_expense:
            key = rec['trunc_month'].strftime('%Y-%m')
            month_map.setdefault(key, {'month': key, 'income': 0, 'expense': 0})
            month_map[key]['expense'] = float(rec['total'] or 0)
        monthly_trend = sorted(month_map.values(), key=lambda x: x['month'])

        # ── Recent 10 transactions combined ─────────────────────────────────
        recent_income = list(income_qs.order_by('-payment_date', '-id')[:10].values(
            'id', 'receipt_number', 'amount_paid', 'payment_date', 'payment_method', 'remarks'
        ))
        for r in recent_income:
            r['type'] = 'income'
            r['amount'] = float(r.pop('amount_paid'))
            r['date']   = str(r.pop('payment_date'))
            r['label']  = f"Receipt #{r['receipt_number']}"

        recent_expense = list(exp_qs.order_by('-date', '-id')[:10].values(
            'id', 'category', 'amount', 'date', 'recipient', 'description', 'payment_method'
        ))
        for r in recent_expense:
            r['type']   = 'expense'
            r['amount'] = float(r['amount'])
            r['date']   = str(r['date'])
            r['label']  = r['recipient'] or r['description'] or r['category']

        recent = sorted(
            list(recent_income) + list(recent_expense),
            key=lambda x: x['date'], reverse=True
        )[:15]

        return Response({
            'income': {
                'total':      total_income,
                'count':      income_agg['count'],
                'by_method':  list(income_by_method),
            },
            'expense': {
                'total':      total_expense,
                'count':      exp_agg['count'],
                'by_category': [
                    {**c, 'total': float(c['total'] or 0)}
                    for c in exp_categories
                ],
            },
            'net_balance':    total_income - total_expense,
            'monthly_trend':  monthly_trend,
            'recent_transactions': recent,
        })



class ElectiveSubjectFeeViewSet(viewsets.ModelViewSet):
    serializer_class = ElectiveSubjectFeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = ElectiveSubjectFee.objects.using(db).select_related('subject', 'class_obj')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            qs = qs.filter(class_obj_id=class_id)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        db = get_current_tenant_db()
        fees_data = request.data.get('fees', [])
        class_id = request.data.get('class_id')
        
        if not class_id:
            return Response({'detail': 'class_id is required for bulk save.'}, status=status.HTTP_400_BAD_REQUEST)
            
        updated_count = 0
        for item in fees_data:
            subject_id = item.get('subject')
            fee_name = item.get('fee_name')
            try:
                amount = float(item.get('amount', 0))
            except (TypeError, ValueError):
                continue
                
            if not subject_id or not fee_name:
                continue

            ElectiveSubjectFee.objects.using(db).update_or_create(
                class_obj_id=class_id,
                subject_id=subject_id,
                defaults={
                    'fee_name': fee_name,
                    'amount': amount
                }
            )
            updated_count += 1
            


class SchoolIncomeViewSet(viewsets.ModelViewSet):
    """
    CRUD for SchoolIncome. Independent of student fee payments.
    Filters: from_date, to_date, category, payment_method
    """
    serializer_class   = SchoolIncomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = SchoolIncome.objects.using(db).all()
        for param in ('category', 'payment_method'):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        from_date = self.request.query_params.get('from_date')
        to_date   = self.request.query_params.get('to_date')
        if from_date: qs = qs.filter(date__gte=from_date)
        if to_date:   qs = qs.filter(date__lte=to_date)
        return qs

    def perform_create(self, serializer):
        db = get_current_tenant_db()
        serializer.save(using=db) if hasattr(serializer, 'save') else None
        instance = SchoolIncome(**serializer.validated_data)
        instance.save(using=db)
        serializer.instance = instance

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = SchoolIncome(**serializer.validated_data)
        instance.save(using=db)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        for attr, val in serializer.validated_data.items():
            setattr(instance, attr, val)
        instance.save(using=db)
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        db = get_current_tenant_db()
        qs = self.get_queryset()
        agg = qs.aggregate(total=Sum('amount'), count=Count('id'))
        by_category = list(
            qs.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')
        )
        for c in by_category:
            c['total'] = float(c['total'] or 0)
        return Response({
            'total': float(agg['total'] or 0),
            'count': agg['count'],
            'by_category': by_category,
        })


class SchoolExpenditureViewSet(viewsets.ModelViewSet):
    """
    CRUD for SchoolExpenditure. Independent of student fee expenses.
    Filters: from_date, to_date, category, payment_method
    Extra action: /overview/ — combined income vs expenditure summary.
    """
    serializer_class   = SchoolExpenditureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = SchoolExpenditure.objects.using(db).all()
        for param in ('category', 'payment_method'):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        from_date = self.request.query_params.get('from_date')
        to_date   = self.request.query_params.get('to_date')
        if from_date: qs = qs.filter(date__gte=from_date)
        if to_date:   qs = qs.filter(date__lte=to_date)
        return qs

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = SchoolExpenditure(**serializer.validated_data)
        instance.save(using=db)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        for attr, val in serializer.validated_data.items():
            setattr(instance, attr, val)
        instance.save(using=db)
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        db = get_current_tenant_db()
        qs = self.get_queryset()
        agg = qs.aggregate(total=Sum('amount'), count=Count('id'))
        by_category = list(
            qs.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')
        )
        for c in by_category:
            c['total'] = float(c['total'] or 0)
        return Response({
            'total': float(agg['total'] or 0),
            'count': agg['count'],
            'by_category': by_category,
        })

    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        """
        Combined school finance overview using the independent models.
        Params: from_date, to_date
        """
        from django.db.models.functions import TruncMonth
        db        = get_current_tenant_db()
        from_date = request.query_params.get('from_date')
        to_date   = request.query_params.get('to_date')

        inc_qs = SchoolIncome.objects.using(db).all()
        exp_qs = SchoolExpenditure.objects.using(db).all()
        if from_date:
            inc_qs = inc_qs.filter(date__gte=from_date)
            exp_qs = exp_qs.filter(date__gte=from_date)
        if to_date:
            inc_qs = inc_qs.filter(date__lte=to_date)
            exp_qs = exp_qs.filter(date__lte=to_date)

        inc_agg = inc_qs.aggregate(total=Sum('amount'), count=Count('id'))
        exp_agg = exp_qs.aggregate(total=Sum('amount'), count=Count('id'))
        total_income  = float(inc_agg['total'] or 0)
        total_expense = float(exp_agg['total'] or 0)

        # Monthly trend
        month_map = {}
        for rec in (inc_qs.annotate(trunc_month=TruncMonth('date'))
                        .values('trunc_month').annotate(total=Sum('amount')).order_by('trunc_month')):
            key = rec['trunc_month'].strftime('%Y-%m')
            month_map.setdefault(key, {'month': key, 'income': 0, 'expense': 0})
            month_map[key]['income'] = float(rec['total'] or 0)
        for rec in (exp_qs.annotate(trunc_month=TruncMonth('date'))
                        .values('trunc_month').annotate(total=Sum('amount')).order_by('trunc_month')):
            key = rec['trunc_month'].strftime('%Y-%m')
            month_map.setdefault(key, {'month': key, 'income': 0, 'expense': 0})
            month_map[key]['expense'] = float(rec['total'] or 0)

        # Income by category
        inc_categories = list(
            inc_qs.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')
        )
        for c in inc_categories: c['total'] = float(c['total'] or 0)

        # Expense by category
        exp_categories = list(
            exp_qs.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')
        )
        for c in exp_categories: c['total'] = float(c['total'] or 0)

        # Income by payment method
        inc_by_method = list(
            inc_qs.values('payment_method').annotate(total=Sum('amount')).order_by('-total')
        )
        for m in inc_by_method: m['total'] = float(m['total'] or 0)

        # Recent 10 of each
        recent_income = list(inc_qs.order_by('-date', '-id')[:10].values(
            'id', 'title', 'category', 'amount', 'date', 'received_from', 'payment_method'
        ))
        for r in recent_income:
            r['type']   = 'income'
            r['amount'] = float(r['amount'])
            r['date']   = str(r['date'])
            r['label']  = r['title']

        recent_expense = list(exp_qs.order_by('-date', '-id')[:10].values(
            'id', 'title', 'category', 'amount', 'date', 'paid_to', 'payment_method'
        ))
        for r in recent_expense:
            r['type']   = 'expense'
            r['amount'] = float(r['amount'])
            r['date']   = str(r['date'])
            r['label']  = r['title']

        recent = sorted(
            recent_income + recent_expense,
            key=lambda x: x['date'], reverse=True
        )[:15]

        return Response({
            'income':  {'total': total_income,  'count': inc_agg['count'], 'by_category': inc_categories, 'by_method': inc_by_method},
            'expense': {'total': total_expense, 'count': exp_agg['count'], 'by_category': exp_categories},
            'net_balance':   total_income - total_expense,
            'monthly_trend': sorted(month_map.values(), key=lambda x: x['month']),
            'recent_transactions': recent,
        })


class FeeDiscountViewSet(viewsets.ModelViewSet):
    serializer_class = FeeDiscountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return FeeDiscount.objects.using(db).all()

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = FeeDiscount.objects.using(db).create(**serializer.validated_data)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)


class StudentDiscountViewSet(viewsets.ModelViewSet):
    serializer_class = StudentDiscountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return StudentDiscount.objects.using(db).all().select_related('student', 'discount', 'financial_year')

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Handle foreign keys explicitly if needed, but model.objects.create handles IDs
        instance = StudentDiscount.objects.using(db).create(**serializer.validated_data)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)
