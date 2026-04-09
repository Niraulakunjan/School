from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utils.tenant_utils import get_current_tenant_db
from .models import Exam, ExamRoutine, MarkLedger, ExamStudentSummary
from .serializers import (
    ExamSerializer,
    ExamRoutineSerializer, MarkLedgerSerializer, ExamStudentSummarySerializer,
)



class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = Exam.objects.using(db).select_related('financial_year').prefetch_related(
            'routines', 'routines__subject'
        )
        year = self.request.query_params.get('financial_year')
        if year:
            qs = qs.filter(financial_year_id=year)
        return qs


class ExamRoutineViewSet(viewsets.ModelViewSet):
    serializer_class = ExamRoutineSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = ExamRoutine.objects.using(db).select_related('exam', 'subject', 'class_obj')
        exam = self.request.query_params.get('exam')
        class_id = self.request.query_params.get('class_obj')
        if class_id:
            qs = qs.filter(class_obj_id=class_id)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """
        Accept a list of routine entries and upsert them.
        """
        db = get_current_tenant_db()
        entries = request.data
        if not isinstance(entries, list):
            return Response({'detail': 'Expected a list of routine entries.'}, status=status.HTTP_400_BAD_REQUEST)

        saved, errors = [], []
        for idx, entry in enumerate(entries):
            e_id = entry.get('exam')
            c_id = entry.get('class_obj')
            s_id = entry.get('subject')

            if not all([e_id, c_id, s_id]):
                errors.append({'index': idx, 'detail': f'Missing required IDs for row {idx+1}'})
                continue

            try:
                # Sanitize data: turn empty strings into None
                def clean(val):
                    if val == "" or val == "None" or val is None: return None
                    return val

                obj, created = ExamRoutine.objects.using(db).update_or_create(
                    exam_id=e_id,
                    class_obj_id=c_id,
                    subject_id=s_id,
                    defaults={
                        'exam_date': clean(entry.get('exam_date')),
                        'start_time': clean(entry.get('start_time')),
                        'full_marks': clean(entry.get('full_marks')),
                        'pass_marks': clean(entry.get('pass_marks')),
                        'has_practical': entry.get('has_practical', False),
                        'theory_full_marks': clean(entry.get('theory_full_marks')),
                        'theory_pass_marks': clean(entry.get('theory_pass_marks')),
                        'practical_full_marks': clean(entry.get('practical_full_marks')),
                        'practical_pass_marks': clean(entry.get('practical_pass_marks')),
                        'venue': entry.get('venue', '') or '',
                        'remarks': entry.get('remarks', '') or ''
                    }
                )
                saved.append(ExamRoutineSerializer(obj).data)
            except Exception as e:
                errors.append({'index': idx, 'subject': entry.get('subject_name'), 'detail': str(e)})

        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS
        return Response({
            'saved': len(saved), 
            'errors': errors, 
            'data': saved,
            'message': f"Successfully synced {len(saved)} routines. {len(errors)} errors."
        }, status=status_code)


class MarkLedgerViewSet(viewsets.ModelViewSet):
    serializer_class = MarkLedgerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        qs = MarkLedger.objects.using(db).select_related(
            'routine__subject', 'routine__exam', 'routine__class_obj', 'student'
        )
        routine = self.request.query_params.get('routine')
        exam    = self.request.query_params.get('exam')
        class_id = self.request.query_params.get('class_obj')
        if routine:
            qs = qs.filter(routine_id=routine)
        if exam:
            qs = qs.filter(routine__exam_id=exam)
        if class_id:
            qs = qs.filter(routine__class_obj_id=class_id)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """
        Accept a list of mark entries and upsert them atomically.
        Payload: [{ routine, student, marks_obtained, is_absent, remarks }, ...]
        """
        db = get_current_tenant_db()
        entries = request.data
        if not isinstance(entries, list):
            return Response({'detail': 'Expected a list of mark entries.'}, status=400)

        saved, errors = [], []
        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username

        for idx, entry in enumerate(entries):
            routine_id = entry.get('routine')
            student_id = entry.get('student')
            if not routine_id or not student_id:
                errors.append({'index': idx, 'detail': 'routine and student are required.'})
                continue

            try:
                routine = ExamRoutine.objects.using(db).get(pk=routine_id)
                from students.models import Student
                student = Student.objects.using(db).get(pk=student_id)
            except (ExamRoutine.DoesNotExist, Student.DoesNotExist) as e:
                errors.append({'index': idx, 'detail': str(e)})
                continue

            marks_obtained = entry.get('marks_obtained')
            theory_marks = entry.get('theory_marks')
            practical_marks = entry.get('practical_marks')
            is_absent = entry.get('is_absent', False)
            remarks = entry.get('remarks', '')

            obj, created = MarkLedger.objects.using(db).update_or_create(
                routine=routine,
                student=student,
                defaults={
                    'marks_obtained': marks_obtained,
                    'theory_marks': theory_marks,
                    'practical_marks': practical_marks,
                    'is_absent': is_absent,
                    'remarks': remarks,
                    'entered_by': user_name,
                }
            )
            saved.append(MarkLedgerSerializer(obj).data)

        return Response({'saved': len(saved), 'errors': errors})

class ExamStudentSummaryViewSet(viewsets.ModelViewSet):
    queryset = ExamStudentSummary.objects.all()
    serializer_class = ExamStudentSummarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        db = get_current_tenant_db()
        if db.startswith('db_'):
            qs = qs.using(db)
            
        exam = self.request.query_params.get('exam')
        class_id = self.request.query_params.get('class_obj')
        if exam:
            qs = qs.filter(exam_id=exam)
        if class_id:
            qs = qs.filter(class_obj=class_id)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        db = get_current_tenant_db()
        entries = request.data
        if not isinstance(entries, list):
            return Response({'detail': 'Expected a list of summaries.'}, status=400)

        saved, errors = [], []
        for idx, entry in enumerate(entries):
            exam_id = entry.get('exam')
            student_id = entry.get('student')
            class_id = entry.get('class_obj')
            if not exam_id or not student_id or not class_id:
                continue

            attendance = entry.get('attendance')
            remarks = entry.get('remarks', '')

            try:
                exam = Exam.objects.using(db).get(pk=exam_id)
                from students.models import Student
                student = Student.objects.using(db).get(pk=student_id)
                from academics.models import Class
                class_obj = Class.objects.using(db).get(pk=class_id)
            except Exception as e:
                errors.append({'index': idx, 'detail': str(e)})
                continue

            obj, created = ExamStudentSummary.objects.using(db).update_or_create(
                exam=exam,
                student=student,
                defaults={
                    'class_obj': class_obj,
                    'attendance': attendance,
                    'remarks': remarks
                }
            )
            saved.append(ExamStudentSummarySerializer(obj).data)

        response_data = {'saved': len(saved), 'errors': errors, 'data': saved}
        status_code = 200 if not errors else (207 if saved else 400)
        return Response(response_data, status=status_code)
