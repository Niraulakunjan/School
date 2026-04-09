"""
URL configuration for school_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from users.views import UserViewSet
from students.views import StudentViewSet, StudentDocumentViewSet, StudentAttendanceViewSet, SchoolHolidayViewSet
from teachers.views import (
    TeacherViewSet, StaffSalaryStructureViewSet, StaffMonthlySalaryViewSet,
    StaffPostViewSet, StaffCategoryViewSet, PayrollSettingsViewSet
)
from tenants.views import SchoolTenantViewSet
from finance.views import (
    FinancialYearViewSet, FeeStructureViewSet, FeeCollectionViewSet, 
    StudentFeeEnrollmentViewSet, ExpenseViewSet, BusRouteViewSet,
    ElectiveSubjectFeeViewSet, SchoolIncomeViewSet, SchoolExpenditureViewSet,
    FeeDiscountViewSet, StudentDiscountViewSet
)
from academics.views import ClassViewSet, SubjectViewSet, ClassSubjectViewSet
from exams.views import ExamViewSet, ExamRoutineViewSet, MarkLedgerViewSet, ExamStudentSummaryViewSet
from school_settings.views import SchoolSettingViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tenants', SchoolTenantViewSet, basename='tenant')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'student-documents', StudentDocumentViewSet, basename='student-document')
router.register(r'student-attendance', StudentAttendanceViewSet, basename='student-attendance')
router.register(r'school-holidays', SchoolHolidayViewSet, basename='school-holiday')
router.register(r'teachers', TeacherViewSet, basename='teachers')
router.register(r'staff-posts', StaffPostViewSet, basename='staff-posts')
router.register(r'staff-categories', StaffCategoryViewSet, basename='staff-categories')
router.register(r'payroll-settings', PayrollSettingsViewSet, basename='payroll-settings')
router.register(r'staff-salary-structures', StaffSalaryStructureViewSet, basename='staff-salary-structures')
router.register(r'staff-monthly-salaries', StaffMonthlySalaryViewSet, basename='staff-monthly-salary')
router.register(r'financial-years', FinancialYearViewSet, basename='financial-year')
router.register(r'fee-structures', FeeStructureViewSet, basename='fee-structure')
router.register(r'fee-collections', FeeCollectionViewSet, basename='fee-collection')
router.register(r'fee-enrollments', StudentFeeEnrollmentViewSet, basename='fee-enrollment')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'classes', ClassViewSet, basename='class')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'class-subjects', ClassSubjectViewSet, basename='class-subject')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'exam-routines', ExamRoutineViewSet, basename='exam-routine')
router.register(r'mark-ledgers', MarkLedgerViewSet, basename='mark-ledger')
router.register(r'exam-student-summaries', ExamStudentSummaryViewSet, basename='exam-student-summary')
router.register(r'bus-routes', BusRouteViewSet, basename='bus-route')
router.register(r'elective-subject-fees', ElectiveSubjectFeeViewSet, basename='elective-subject-fee')
router.register(r'school-income',         SchoolIncomeViewSet,        basename='school-income')
router.register(r'school-expenditure',    SchoolExpenditureViewSet,   basename='school-expenditure')
router.register(r'school-settings',       SchoolSettingViewSet,       basename='school-setting')
router.register(r'fee-discounts',         FeeDiscountViewSet,         basename='fee-discount')
router.register(r'student-discounts',     StudentDiscountViewSet,     basename='student-discount')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Auth Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Core API Endpoints
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
