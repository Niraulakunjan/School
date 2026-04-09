import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import SchoolDashboard from './pages/dashboard/SchoolDashboard';
import StudentAdmissionForm from './pages/dashboard/StudentAdmissionForm';
import Landing from './pages/Landing';
import SchoolSettingsPage from './pages/dashboard/SchoolSettingsPage';
import Login from './pages/Login';
import TenantListPage from './pages/dashboard/TenantListPage';
import StudentListPage from './pages/dashboard/StudentListPage';
import BulkElectivePage from './pages/dashboard/BulkElectivePage';
import TeacherListPage from './pages/dashboard/TeacherListPage';
import StaffAdmissionForm from './pages/dashboard/StaffAdmissionForm';
import SalaryMatrixPage from './pages/dashboard/SalaryMatrixPage';
import SalaryGenerationPage from './pages/dashboard/SalaryGenerationPage';
import StaffDashboardLayout from './components/layout/StaffDashboardLayout';
import AbsentDaysPage from './pages/dashboard/AbsentDaysPage';
import TotalReportPage from './pages/dashboard/TotalReportPage';
import BankStatementPage from './pages/dashboard/BankStatementPage';
import PayrollSettingsPage from './pages/dashboard/PayrollSettingsPage';
import UserManagement from './pages/UserManagement';
import FeeStructurePage from './pages/dashboard/FeeStructurePage';
import FeeCollectionPage from './pages/dashboard/FeeCollectionPage';
import FeeEnrollmentPage from './pages/dashboard/FeeEnrollmentPage';
import StudentFeeHistoryPage from './pages/dashboard/StudentFeeHistoryPage';
import ClassManagementPage from './pages/dashboard/ClassManagementPage';
import SubjectManagementPage from './pages/dashboard/SubjectManagementPage';
import ElectiveFeePage from './pages/dashboard/ElectiveFeePage';
import ExamSetupPage from './pages/exams/ExamSetupPage';
import ExamRoutinePage from './pages/exams/ExamRoutinePage';
import MarkLedgerPage from './pages/exams/MarkLedgerPage';
import ViewLedgerPage from './pages/exams/ViewLedgerPage';
import ExamResultPage from './pages/exams/ExamResultPage';
import GradeSheetPrintPage from './pages/exams/GradeSheetPrintPage';
import BulkGradeSheetsPrintPage from './pages/exams/BulkGradeSheetsPrintPage';
import BusManagementPage from './pages/dashboard/BusManagementPage';
import BulkAttendancePage from './pages/dashboard/BulkAttendancePage';
import StudentAttendanceReportPage from './pages/dashboard/StudentAttendanceReportPage';
import SchoolFinancePage from './pages/dashboard/SchoolFinancePage';
import DiscountManagementPage from './pages/dashboard/DiscountManagementPage';
import GenerateFeePage from './pages/dashboard/GenerateFeePage';
import { getTenantFromSubdomain } from './utils/tenant';


const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">🚧</div>
    <h2 className="text-xl font-black text-white">{title} Module</h2>
    <p className="text-slate-500 text-sm">Coming soon...</p>
  </div>
);

// Blocks access to superadmin-only routes when on a tenant subdomain
const SuperAdminOnly = ({ children }) => {
  const isTenant = !!getTenantFromSubdomain();
  if (isTenant) return <Navigate to="/dashboard" replace />;
  return children;
};

// Blocks access to tenant-only routes when on superadmin (localhost)
const TenantOnly = ({ children }) => {
  const isTenant = !!getTenantFromSubdomain();
  if (!isTenant) return <Navigate to="/dashboard" replace />;
  return children;
};

const DashboardIndex = () => {
  const isTenant = !!getTenantFromSubdomain();
  return isTenant ? <SchoolDashboard /> : <Dashboard />;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Dedicated Printing Routes (Zero Layout) */}
          <Route path="/print/grade-sheet/:examId/:studentId" element={<GradeSheetPrintPage />} />
          <Route path="/print/bulk-grade-sheets/:examId/:classId" element={<BulkGradeSheetsPrintPage />} />


          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardIndex />} />

            {/* Tenant-only routes */}
            <Route path="users"      element={<TenantOnly><UserManagement /></TenantOnly>} />
            <Route path="students"   element={<TenantOnly><StudentListPage /></TenantOnly>} />
            <Route path="students/:id" element={<TenantOnly><StudentAdmissionForm /></TenantOnly>} />
            <Route path="students/new" element={<TenantOnly><StudentAdmissionForm /></TenantOnly>} />
            <Route path="students/electives" element={<TenantOnly><BulkElectivePage /></TenantOnly>} />
            <Route path="teachers/*" element={<Navigate to="/dashboard/staff" replace />} />
            <Route path="staff" element={<TenantOnly><StaffDashboardLayout /></TenantOnly>}>
              <Route index element={<TeacherListPage />} />
              <Route path="new" element={<StaffAdmissionForm />} />
              <Route path=":id" element={<StaffAdmissionForm />} />
              <Route path="salary" element={<SalaryMatrixPage />} />
              <Route path="payroll" element={<SalaryGenerationPage />} />
              <Route path="absent" element={<AbsentDaysPage />} />
              <Route path="reports/total" element={<TotalReportPage />} />
              <Route path="reports/bank" element={<BankStatementPage />} />
              <Route path="settings/payroll" element={<PayrollSettingsPage />} />
              <Route path="settings/posts" element={<PayrollSettingsPage />} />
              <Route path="settings/categories" element={<PayrollSettingsPage />} />
            </Route>
            <Route path="attendance" element={<TenantOnly><BulkAttendancePage /></TenantOnly>} />
            <Route path="attendance/report" element={<TenantOnly><StudentAttendanceReportPage /></TenantOnly>} />
            <Route path="fees"       element={<TenantOnly><ComingSoon title="Fees" /></TenantOnly>} />
            <Route path="classes"    element={<TenantOnly><ClassManagementPage /></TenantOnly>} />
            <Route path="subjects"   element={<TenantOnly><SubjectManagementPage /></TenantOnly>} />
            <Route path="finance/generate-fees" element={<TenantOnly><GenerateFeePage /></TenantOnly>} />
            <Route path="finance/enrollment" element={<TenantOnly><FeeEnrollmentPage /></TenantOnly>} />

            <Route path="finance/fees"       element={<TenantOnly><FeeCollectionPage /></TenantOnly>} />
            <Route path="finance/collection" element={<TenantOnly><FeeCollectionPage /></TenantOnly>} />
            <Route path="finance/structure"  element={<TenantOnly><FeeStructurePage /></TenantOnly>} />
            <Route path="finance/elective-fees" element={<TenantOnly><ElectiveFeePage /></TenantOnly>} />
            <Route path="finance/history"    element={<TenantOnly><StudentFeeHistoryPage /></TenantOnly>} />
            <Route path="finance/expenses"   element={<TenantOnly><ComingSoon title="Expenses" /></TenantOnly>} />
            <Route path="finance/overview"   element={<TenantOnly><SchoolFinancePage /></TenantOnly>} />
            <Route path="finance/reports"    element={<TenantOnly><SchoolFinancePage /></TenantOnly>} />
            <Route path="finance/bus"        element={<TenantOnly><BusManagementPage /></TenantOnly>} />
            <Route path="finance/discounts"  element={<TenantOnly><DiscountManagementPage /></TenantOnly>} />
            <Route path="exams/setup"       element={<TenantOnly><ExamSetupPage /></TenantOnly>} />
            <Route path="exams/:examId/routine" element={<TenantOnly><ExamRoutinePage /></TenantOnly>} />
            <Route path="exams/ledger"      element={<TenantOnly><MarkLedgerPage /></TenantOnly>} />
            <Route path="exams/view-ledger" element={<TenantOnly><ViewLedgerPage /></TenantOnly>} />
            <Route path="exams/results"     element={<TenantOnly><ExamResultPage /></TenantOnly>} />

            {/* Superadmin-only routes */}
            <Route path="tenants"  element={<SuperAdminOnly><TenantListPage /></SuperAdminOnly>} />
            <Route path="settings" element={<SuperAdminOnly><ComingSoon title="Settings" /></SuperAdminOnly>} />
            <Route path="settings/school" element={<TenantOnly><SchoolSettingsPage /></TenantOnly>} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
