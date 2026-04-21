from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Class, Section, Subject, ClassSubject
from .serializers import ClassSerializer, SectionSerializer, SubjectSerializer, ClassSubjectSerializer
from utils.tenant_utils import get_current_tenant_db
from django.db import IntegrityError


class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return Class.objects.using(db).prefetch_related('sections', 'subjects', 'subjects__subject').all()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """
        Accept a list of class definitions and upsert them.
        Payload: [{ id?, name, faculty }, ...]
        """
        db = get_current_tenant_db()
        entries = request.data
        if not isinstance(entries, list):
            return Response({'detail': 'Expected a list of classes.'}, status=status.HTTP_400_BAD_REQUEST)

        saved, errors = [], []
        for idx, entry in enumerate(entries):
            c_id = entry.get('id')
            name = entry.get('name')
            if not name:
                errors.append({'index': idx, 'detail': 'Class name is required.'})
                continue

            try:
                if c_id:
                    obj = Class.objects.using(db).get(pk=c_id)
                    obj.name = name
                    obj.faculty = entry.get('faculty', '')
                    obj.save(using=db)
                else:
                    obj = Class.objects.using(db).create(
                        name=name,
                        faculty=entry.get('faculty', ''),
                        order=idx
                    )
                saved.append(ClassSerializer(obj).data)
            except Exception as e:
                errors.append({'index': idx, 'detail': str(e)})

        return Response({'saved': len(saved), 'errors': errors, 'data': saved}, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)

    @action(detail=True, methods=['post'], url_path='sections')
    def add_section(self, request, pk=None):
        db = get_current_tenant_db()
        if db == 'default':
            return Response({'detail': 'Tenant context required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        class_obj = self.get_object()
        serializer = SectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            serializer.save(class_obj=class_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response({'name': ['A section with this name already exists in this class.']}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'], url_path='sections/(?P<section_id>[^/.]+)')
    def delete_section(self, request, pk=None, section_id=None):
        db = get_current_tenant_db()
        try:
            section = Section.objects.using(db).get(pk=section_id, class_obj__pk=pk)
            section.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Section.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='subjects')
    def add_subject(self, request, pk=None):
        db = get_current_tenant_db()
        if db == 'default':
            return Response({'detail': 'Tenant context required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        cls = self.get_object()
        serializer = ClassSubjectSerializer(data=request.data)
        # Set database for validation
        if 'subject' in serializer.fields:
            serializer.fields['subject'].queryset = Subject.objects.using(db).all()
            
        if serializer.is_valid():
            try:
                serializer.save(class_obj=cls)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError:
                return Response({'subject': ['This subject is already assigned to this class.']}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='subjects/(?P<sub_id>[^/.]+)')
    def remove_subject(self, request, pk=None, sub_id=None):
        db = get_current_tenant_db()
        ClassSubject.objects.using(db).filter(class_obj_id=pk, id=sub_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='clone-curriculum')
    def clone_curriculum(self, request, pk=None):
        """
        Copy all ClassSubject mappings from a source class to this target class.
        Body: { "source_class_id": 5 }
        """
        db = get_current_tenant_db()
        target_class = self.get_object()
        source_class_id = request.data.get('source_class_id')
        
        if not source_class_id:
            return Response({'detail': 'Source class ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        source_subjects = ClassSubject.objects.using(db).filter(class_obj_id=source_class_id)
        
        created_count = 0
        for ss in source_subjects:
            # Avoid duplicate subjects in target class
            obj, created = ClassSubject.objects.using(db).get_or_create(
                class_obj=target_class,
                subject=ss.subject,
                defaults={
                    'is_optional': ss.is_optional,
                    'is_elective': ss.is_elective,
                    'elective_group': ss.elective_group,
                    'credit_hours': ss.credit_hours,
                    'full_marks': ss.full_marks,
                    'pass_marks': ss.pass_marks,
                    'order': ss.order
                }
            )
            if created:
                created_count += 1
                
        return Response({'detail': f'Successfully cloned {created_count} subjects to {target_class.name}.'})


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return Subject.objects.using(db).all()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        from django.db.models.deletion import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as e:
            # Build a list of descriptions for the protected objects
            protected_list = []
            for obj in e.protected_objects:
                # If it's a ClassSubject, extract the class name for clarity
                if hasattr(obj, 'class_obj'):
                    protected_list.append(f"Class: {obj.class_obj.name}")
                else:
                    protected_list.append(str(obj))
            
            # Remove duplicates and limit the list size
            unique_protected = sorted(list(set(protected_list)))
            if len(unique_protected) > 5:
                deps_str = ", ".join(unique_protected[:5]) + f", and {len(unique_protected)-5} more..."
            else:
                deps_str = ", ".join(unique_protected)
            
            return Response({
                'detail': f'Cannot delete this subject: It is currently assigned to {deps_str}.',
                'code': 'protected_error',
                'dependencies': unique_protected
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """
        Accept a list of global subject definitions and upsert them.
        Payload: [{ id?, name, code, faculty, full_marks, pass_marks }, ...]
        """
        db = get_current_tenant_db()
        entries = request.data
        if not isinstance(entries, list):
            return Response({'detail': 'Expected a list of subjects.'}, status=status.HTTP_400_BAD_REQUEST)

        saved, errors = [], []
        for idx, entry in enumerate(entries):
            s_id = entry.get('id')
            name = entry.get('name', '').strip()
            if not name:
                errors.append({'index': idx, 'detail': 'Subject name is required.'})
                continue

            try:
                # Type conversions for incoming data
                fm = int(entry.get('full_marks', 100))
                pm = int(entry.get('pass_marks', 35))
                order = int(entry.get('order', 0))
                
                if s_id:
                    try:
                        obj = Subject.objects.using(db).get(pk=s_id)
                        obj.name = name
                        obj.code = entry.get('code', '')
                        obj.faculty = entry.get('faculty', '')
                        obj.full_marks = fm
                        obj.pass_marks = pm
                        obj.order = order
                        obj.is_elective = entry.get('is_elective', obj.is_elective)
                        obj.elective_group = entry.get('elective_group', obj.elective_group)
                        obj.save(using=db)
                    except Subject.DoesNotExist:
                        errors.append({'index': idx, 'detail': f'Subject with ID {s_id} not found.'})
                        continue
                else:
                    obj = Subject.objects.using(db).create(
                        name=name,
                        code=entry.get('code', ''),
                        faculty=entry.get('faculty', ''),
                        full_marks=fm,
                        pass_marks=pm,
                        order=order,
                        is_elective=entry.get('is_elective', False),
                        elective_group=entry.get('elective_group', '')
                    )
                saved.append(SubjectSerializer(obj).data)
            except Exception as e:
                errors.append({'index': idx, 'detail': str(e)})

        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS
        return Response({'saved': len(saved), 'errors': errors, 'data': saved}, status=status_code)


class ClassSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        db = get_current_tenant_db()
        return ClassSubject.objects.using(db).select_related('class_obj', 'subject').all()

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        if hasattr(serializer, 'fields'):
            db = get_current_tenant_db()
            if 'subject' in serializer.fields:
                serializer.fields['subject'].queryset = Subject.objects.using(db).all()
            if 'class_obj' in serializer.fields:
                serializer.fields['class_obj'].queryset = Class.objects.using(db).all()
        return serializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        db = get_current_tenant_db()
        data = request.data
        if not isinstance(data, list):
            return Response({'detail': 'Expected a list.'}, status=400)
        
        saved, errors = [], []
        for idx, item in enumerate(data):
            c_id = item.get('class_obj')
            s_id = item.get('subject')
            if not c_id or not s_id:
                errors.append({'index': idx, 'detail': 'class_obj and subject are required.'}); continue
            
            try:
                # Check for existing to avoid unique constraint error
                obj = ClassSubject.objects.using(db).filter(class_obj_id=c_id, subject_id=s_id).first()
                if obj:
                    obj.pass_marks = item.get('pass_marks', obj.pass_marks)
                    obj.is_elective = item.get('is_elective', obj.is_elective)
                    obj.elective_group = item.get('elective_group', obj.elective_group)
                    obj.save(using=db)
                else:
                    obj = ClassSubject.objects.using(db).create(
                        class_obj_id=c_id, 
                        subject_id=s_id,
                        full_marks=item.get('full_marks', 100),
                        pass_marks=item.get('pass_marks', 35),
                        is_elective=item.get('is_elective', False),
                        elective_group=item.get('elective_group', '')
                    )
                saved.append(ClassSubjectSerializer(obj).data)
            except Exception as e:
                errors.append({'index': idx, 'detail': str(e)})
        
        return Response({'saved': len(saved), 'errors': errors, 'data': saved})
