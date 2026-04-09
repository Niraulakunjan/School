from django.contrib import admin
from .models import (
    FinancialYear, FeeStructure, ClassFeeDetail, FeeItem,
    StudentFeeEnrollment, FeeCollection, PreviousYearDue,
    MonthlyDemand, ClassMonthlyFee, FeeDiscount, StudentDiscount,
    Expense, BusRoute, ElectiveSubjectFee, SchoolIncome, SchoolExpenditure
)

@admin.register(FinancialYear)
class FinancialYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active',)

@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ('name', 'financial_year', 'is_active')
    list_filter = ('financial_year', 'is_active')

@admin.register(ClassFeeDetail)
class ClassFeeDetailAdmin(admin.ModelAdmin):
    list_display = ('class_name', 'faculty', 'fee_structure')
    list_filter = ('fee_structure', 'class_name')

@admin.register(FeeItem)
class FeeItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount', 'frequency', 'structure_detail')
    list_filter = ('frequency', 'structure_detail')

@admin.register(StudentFeeEnrollment)
class StudentFeeEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'class_name', 'section', 'financial_year', 'status')
    list_filter = ('status', 'financial_year', 'class_name')
    search_fields = ('student__first_name', 'student__last_name', 'student__admission_number')

@admin.register(FeeCollection)
class FeeCollectionAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'student', 'amount_paid', 'payment_date', 'payment_method')
    list_filter = ('payment_method', 'payment_date', 'financial_year')
    search_fields = ('receipt_number', 'student__first_name', 'student__last_name')

@admin.register(PreviousYearDue)
class PreviousYearDueAdmin(admin.ModelAdmin):
    list_display = ('student', 'financial_year', 'opening_balance', 'amount_paid')
    list_filter = ('financial_year',)

@admin.register(MonthlyDemand)
class MonthlyDemandAdmin(admin.ModelAdmin):
    list_display = ('student', 'financial_year', 'month', 'total_amount', 'status')
    list_filter = ('month', 'status', 'financial_year')

@admin.register(ClassMonthlyFee)
class ClassMonthlyFeeAdmin(admin.ModelAdmin):
    list_display = ('structure_detail', 'month')

@admin.register(FeeDiscount)
class FeeDiscountAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_type', 'value', 'is_active')

@admin.register(StudentDiscount)
class StudentDiscountAdmin(admin.ModelAdmin):
    list_display = ('student', 'discount', 'financial_year', 'is_active')

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('category', 'amount', 'date', 'recipient', 'payment_method')
    list_filter = ('category', 'payment_method', 'date')
    search_fields = ('recipient', 'description')

@admin.register(BusRoute)
class BusRouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_active')

@admin.register(ElectiveSubjectFee)
class ElectiveSubjectFeeAdmin(admin.ModelAdmin):
    list_display = ('class_obj', 'subject', 'fee_name', 'amount')

@admin.register(SchoolIncome)
class SchoolIncomeAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'amount', 'date', 'payment_method')
    list_filter = ('category', 'payment_method', 'date')

@admin.register(SchoolExpenditure)
class SchoolExpenditureAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'amount', 'date', 'payment_method')
    list_filter = ('category', 'payment_method', 'date')
