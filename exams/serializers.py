from rest_framework import serializers
from .models import Exam, ExamRoutine, MarkLedger, ExamStudentSummary
from academics.models import Subject, ClassSubject
from utils.tenant_utils import get_current_tenant_db


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class ExamRoutineSerializer(serializers.ModelSerializer):
    subject_name        = serializers.CharField(source='subject.name', read_only=True)
    subject_code        = serializers.CharField(source='subject.code', read_only=True)
    class_name          = serializers.CharField(source='class_obj.name', read_only=True)
    faculty             = serializers.CharField(source='class_obj.faculty', read_only=True)
    effective_full_marks = serializers.ReadOnlyField()
    effective_pass_marks = serializers.ReadOnlyField()
    credit_hours        = serializers.SerializerMethodField()
    is_elective         = serializers.BooleanField(source='subject.is_elective', read_only=True)

    class Meta:
        model = ExamRoutine
        fields = (
            'id', 'exam', 'subject', 'subject_name', 'subject_code',
            'class_obj', 'class_name', 'faculty',
            'exam_date', 'start_time',
            'full_marks', 'pass_marks',
            'has_practical', 'theory_full_marks', 'theory_pass_marks', 
            'practical_full_marks', 'practical_pass_marks',
            'effective_full_marks', 'effective_pass_marks',
            'credit_hours', 'is_elective',
            'venue', 'remarks',
        )

    def get_credit_hours(self, obj):
        db = get_current_tenant_db()
        try:
            cs = ClassSubject.objects.using(db).get(
                class_obj=obj.class_obj,
                subject=obj.subject
            )
            return cs.credit_hours
        except ClassSubject.DoesNotExist:
            return None


class ExamSerializer(serializers.ModelSerializer):
    financial_year_name = serializers.CharField(source='financial_year.name', read_only=True)
    routines            = ExamRoutineSerializer(many=True, read_only=True)
    term_display        = serializers.CharField(source='get_term_display', read_only=True)

    class Meta:
        model = Exam
        fields = (
            'id', 'name', 'term', 'term_display',
            'financial_year', 'financial_year_name',
            'start_date', 'total_working_days',
            'is_published', 'remarks', 'created_at',
            'routines',
        )


class MarkLedgerSerializer(serializers.ModelSerializer):
    student_name   = serializers.SerializerMethodField()
    student_roll   = serializers.SerializerMethodField()
    grade          = serializers.ReadOnlyField()

    class Meta:
        model = MarkLedger
        fields = (
            'id', 'routine', 'student',
            'student_name', 'student_roll',
            'marks_obtained', 'theory_marks', 'practical_marks',
            'is_absent', 'remarks',
            'entered_by', 'updated_at', 'grade',
        )

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip()

    def get_student_roll(self, obj):
        return obj.student.roll_number


class ExamStudentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamStudentSummary
        fields = ('id', 'exam', 'student', 'class_obj', 'attendance', 'remarks', 'updated_at')
