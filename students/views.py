from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from .models import Student, StudentDocument, StudentAttendance, SchoolHoliday
from .serializers import StudentSerializer, StudentDocumentSerializer, StudentAttendanceSerializer, SchoolHolidaySerializer
from utils.tenant_utils import get_current_tenant_db, get_current_tenant_domain

User = get_user_model()

def generate_student_ids(db):
    domain = get_current_tenant_domain() or 'sch'
    prefix = domain.upper()
    count = Student.objects.using(db).count() + 1
    seq = str(count).zfill(4)
    return f"{prefix}-ADM-{seq}", f"{prefix}-ST-{seq}"


class StudentDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        db = get_current_tenant_db()
        return StudentDocument.objects.using(db).select_related('student')

    def perform_create(self, serializer):
        db = get_current_tenant_db()
        serializer.save()


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = Student.objects.using(db).select_related('user').prefetch_related('documents')
        
        # Filtering by class and section
        class_name = self.request.query_params.get('class_name')
        section = self.request.query_params.get('section')
        
        if class_name:
            qs = qs.filter(class_name=class_name)
        if section:
            qs = qs.filter(section=section)
            
        return qs

    def create(self, request, *args, **kwargs):
        db = get_current_tenant_db()
        data = request.data.copy()

        adm_no, reg_no = generate_student_ids(db)
        if not data.get('admission_number'):
            data['admission_number'] = adm_no
        if not data.get('registration_number'):
            data['registration_number'] = reg_no

        username = data.get('admission_number').lower().replace('-', '')
        email = data.get('email') or f"{username}@school.local"
        user = User(username=username, email=email, role='STUDENT',
                    first_name=data.get('first_name', ''),
                    last_name=data.get('last_name', ''))
        user.set_password(data.get('admission_number'))
        user.save(using=db)

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            user.delete()
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        student = serializer.save(user=user)

        # Handle Many-to-Many fields from Form-Data (Multipart)
        elective_ids = request.data.getlist('elective_subjects')
        if elective_ids:
            student.elective_subjects.set(elective_ids)

        # Handle documents uploaded alongside the form
        # Expects: doc_type_0, doc_title_0, doc_file_0, doc_type_1, ...
        i = 0
        while f'doc_file_{i}' in request.FILES:
            StudentDocument.objects.using(db).create(
                student=student,
                doc_type=data.get(f'doc_type_{i}', 'other'),
                title=data.get(f'doc_title_{i}', ''),
                file=request.FILES[f'doc_file_{i}'],
            )
            i += 1

        return Response(self.get_serializer(student).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        instance.delete()
        if user:
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='generate-ids')
    def generate_ids(self, request):
        db = get_current_tenant_db()
        adm, reg = generate_student_ids(db)
        return Response({'admission_number': adm, 'registration_number': reg})

    @action(detail=True, methods=['post'], url_path='upload-document', parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, pk=None):
        db = get_current_tenant_db()
        student = self.get_object()
        serializer = StudentDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(student=student)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='documents/(?P<doc_id>[^/.]+)')
    def delete_document(self, request, pk=None, doc_id=None):
        db = get_current_tenant_db()
        try:
            doc = StudentDocument.objects.using(db).get(pk=doc_id, student__pk=pk)
            doc.file.delete(save=False)
            doc.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except StudentDocument.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    @action(detail=False, methods=['post'], url_path='bulk-assign-electives')
    def bulk_assign_electives(self, request):
        db = get_current_tenant_db()
        # Expects: { "assignments": [ { "student_id": 1, "subject_ids": [5, 6] }, ... ] }
        assignments = request.data.get('assignments', [])
        
        if not assignments:
            return Response({'detail': 'No assignments provided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        updated_count = 0
        for entry in assignments:
            student_id = entry.get('student_id')
            subject_ids = entry.get('subject_ids', [])
            
            try:
                student = Student.objects.using(db).get(pk=student_id)
                student.elective_subjects.set(subject_ids)
                updated_count += 1
            except Student.DoesNotExist:
                continue
                
        return Response({'detail': f'Successfully updated electives for {updated_count} students.'}, status=status.HTTP_200_OK)


class StudentAttendanceViewSet(viewsets.ModelViewSet):
    """CRUD + bulk operations for student daily attendance."""
    serializer_class = StudentAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = StudentAttendance.objects.using(db).select_related('student')

        date       = self.request.query_params.get('date')
        class_name = self.request.query_params.get('class_name')
        section    = self.request.query_params.get('section')

        if date:
            qs = qs.filter(date=date)
        if class_name:
            qs = qs.filter(student__class_name=class_name)
        if section:
            qs = qs.filter(student__section=section)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-mark')
    def bulk_mark(self, request):
        """
        Expects:
        {
          "date": "2081-12-22",         # Nepali or AD date string
          "records": [
            {"student_id": 1, "status": "P", "remark": ""},
            ...
          ]
        }
        Uses update_or_create so re-submitting the same day is idempotent.
        """
        db = get_current_tenant_db()
        date    = request.data.get('date')
        records = request.data.get('records', [])

        if not date:
            return Response({'detail': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not records:
            return Response({'detail': 'records list is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        saved, errors = [], []
        for rec in records:
            student_id = rec.get('student_id')
            s_status   = rec.get('status', 'P')
            remark     = rec.get('remark', '')

            if s_status not in ('P', 'A', 'L', 'H'):
                errors.append({'student_id': student_id, 'error': f'Invalid status: {s_status}'})
                continue

            try:
                obj, _ = StudentAttendance.objects.using(db).update_or_create(
                    student_id=student_id, date=date,
                    defaults={'status': s_status, 'remark': remark}
                )
                saved.append(obj.id)
            except Exception as e:
                errors.append({'student_id': student_id, 'error': str(e)})

        return Response({'saved': len(saved), 'errors': errors}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='daily-summary')
    def daily_summary(self, request):
        """
        Returns existing attendance records for a given date + class,
        keyed by student_id for easy front-end hydration.
        """
        db         = get_current_tenant_db()
        date       = request.query_params.get('date')
        class_name = request.query_params.get('class_name')
        section    = request.query_params.get('section')

        if not date or not class_name:
            return Response({'detail': 'date and class_name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = StudentAttendance.objects.using(db).filter(
            date=date,
            student__class_name=class_name,
        )
        if section:
            qs = qs.filter(student__section=section)

        result = {rec.student_id: {'status': rec.status, 'remark': rec.remark} for rec in qs}

        # Also include whether this date is a global school holiday
        is_holiday = SchoolHoliday.objects.using(db).filter(date=date).first()
        holiday_info = None
        if is_holiday:
            holiday_info = {'title': is_holiday.title, 'description': is_holiday.description}

        return Response({'records': result, 'holiday': holiday_info})

    @action(detail=False, methods=['get'], url_path='student-summary')
    def student_summary(self, request):
        """
        Per-student attendance summary for a class over a date range.
        Query params:
          class_name (required)
          section (optional)
          from_date (optional, YYYY-MM-DD)
          to_date   (optional, YYYY-MM-DD)

        Returns list of:
          {student_id, name, admission_number, roll_number,
           working_days, present, absent, late, holiday, attendance_pct}
        Working days = P + A + L  (school-open days, excludes holidays).
        Attendance % = (P + L) / working_days * 100.
        """
        from django.db.models import Count, Q
        db         = get_current_tenant_db()
        class_name = request.query_params.get('class_name')
        section    = request.query_params.get('section')
        from_date  = request.query_params.get('from_date')
        to_date    = request.query_params.get('to_date')

        if not class_name:
            return Response({'detail': 'class_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Base student queryset
        student_qs = Student.objects.using(db).filter(class_name=class_name)
        if section:
            student_qs = student_qs.filter(section=section)
        students = list(student_qs.values('id', 'first_name', 'last_name', 'admission_number', 'roll_number', 'section'))

        # Base attendance queryset
        att_qs = StudentAttendance.objects.using(db).filter(student__class_name=class_name)
        if section:
            att_qs = att_qs.filter(student__section=section)
        if from_date:
            att_qs = att_qs.filter(date__gte=from_date)
        if to_date:
            att_qs = att_qs.filter(date__lte=to_date)

        # Aggregate per student
        agg = att_qs.values('student_id').annotate(
            present = Count('id', filter=Q(status='P')),
            absent  = Count('id', filter=Q(status='A')),
            late    = Count('id', filter=Q(status='L')),
            holiday = Count('id', filter=Q(status='H')),
        )
        agg_map = {r['student_id']: r for r in agg}

        result = []
        for s in students:
            a = agg_map.get(s['id'], {'present': 0, 'absent': 0, 'late': 0, 'holiday': 0})
            P, A, L, H = a['present'], a['absent'], a['late'], a['holiday']
            working_days = P + A + L       # school-open days for this student
            attended     = P + L           # counted as attended (present + late)
            pct = round((attended / working_days * 100), 1) if working_days > 0 else 0.0
            result.append({
                'student_id':       s['id'],
                'name':             f"{s['first_name']} {s['last_name']}".strip(),
                'admission_number': s['admission_number'],
                'roll_number':      s['roll_number'] or '',
                'section':          s['section'] or '',
                'working_days':     working_days,
                'present':          P,
                'absent':           A,
                'late':             L,
                'holiday':          H,
                'attendance_pct':   pct,
            })

        # Sort: most absent first
        result.sort(key=lambda x: x['absent'], reverse=True)
        return Response(result)



class SchoolHolidayViewSet(viewsets.ModelViewSet):
    """Manage global school holidays."""
    serializer_class = SchoolHolidaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = SchoolHoliday.objects.using(db)
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(date__year=year)
        return qs

    def perform_create(self, serializer):
        db = get_current_tenant_db()
        instance = serializer.save()
        # Move to tenant DB if not default
        if db != 'default':
            instance._state.db = db
            instance.save(using=db)

    def perform_destroy(self, instance):
        instance.delete()


