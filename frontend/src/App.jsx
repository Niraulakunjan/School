import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Loader2 } from 'lucide-react';

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SchoolDashboard = lazy(() => import('./pages/dashboard/SchoolDashboard'));
const StudentAdmissionForm = lazy(() => import('./pages/dashboard/StudentAdmissionForm'));
const Landing = lazy(() => import('./pages/Landing'));
const SchoolSettingsPage = lazy(() => import('./pages/dashboard/SchoolSettingsPage'));
const Login = lazy(() => import('./pages/Login'));
const TenantListPage = lazy(() => import('./pages/dashboard/TenantListPage'));
const StudentListPage = lazy(() => import('./pages/dashboard/StudentListPage'));
const BulkElectivePage = lazy(() => import('./pages/dashboard/BulkElectivePage'));
const TeacherListPage = lazy(() => import('./pages/dashboard/TeacherListPage'));
const StaffAdmissionForm = lazy(() => import('./pages/dashboard/StaffAdmissionForm'));
const SalaryMatrixPage = lazy(() => import('./pages/dashboard/SalaryMatrixPage'));
const SalaryGenerationPage = lazy(() => import('./pages/dashboard/SalaryGenerationPage'));
const StaffDashboardLayout = lazy(() => import('./components/layout/StaffDashboardLayout'));
const AbsentDaysPage = lazy(() => import('./pages/dashboard/AbsentDaysPage'));
const TotalReportPage = lazy(() => import('./pages/dashboard/TotalReportPage'));
const BankStatementPage = lazy(() => import('./pages/dashboard/BankStatementPage'));
const PayrollSettingsPage = lazy(() => import('./pages/dashboard/PayrollSettingsPage'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const FeeStructurePage = lazy(() => import('./pages/dashboard/FeeStructurePage'));
const FeeCollectionPage = lazy(() => import('./pages/dashboard/FeeCollectionPage'));
const FeeEnrollmentPage = lazy(() => import('./pages/dashboard/FeeEnrollmentPage'));
const StudentFeeHistoryPage = lazy(() => import('./pages/dashboard/StudentFeeHistoryPage'));
const ClassManagementPage = lazy(() => import('./pages/dashboard/ClassManagementPage'));
const SubjectManagementPage = lazy(() => import('./pages/dashboard/SubjectManagementPage'));
const ElectiveFeePage = lazy(() => import('./pages/dashboard/ElectiveFeePage'));
const ExamSetupPage = lazy(() => import('./pages/exams/ExamSetupPage'));
const ExamRoutinePage = lazy(() => import('./pages/exams/ExamRoutinePage'));
const MarkLedgerPage = lazy(() => import('./pages/exams/MarkLedgerPage'));
const ViewLedgerPage = lazy(() => import('./pages/exams/ViewLedgerPage'));
const ExamResultPage = lazy(() => import('./pages/exams/ExamResultPage'));
const GradeSheetPrintPage = lazy(() => import('./pages/exams/GradeSheetPrintPage'));
const BulkGradeSheetsPrintPage = lazy(() => import('./pages/exams/BulkGradeSheetsPrintPage'));
const BusManagementPage = lazy(() => import('./pages/dashboard/BusManagementPage'));
const BulkAttendancePage = lazy(() => import('./pages/dashboard/BulkAttendancePage'));
const StudentAttendanceReportPage = lazy(() => import('./pages/dashboard/StudentAttendanceReportPage'));
const SchoolFinancePage = lazy(() => import('./pages/dashboard/SchoolFinancePage'));
const DiscountManagementPage = lazy(() => import('./pages/dashboard/DiscountManagementPage'));
const GenerateFeePage = lazy(() => import('./pages/dashboard/GenerateFeePage'));
import { getTenantFromSubdomain } from './utils/tenant';


const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
        <Loader2 className="text-indigo-500 animate-spin" size={32} />
      </div>
      <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full animate-pulse pointer-events-none" />
    </div>
    <div className="mt-8 flex flex-col items-center">
      <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full animate-progress-indeterminate" />
      </div>
      <p className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">SajiloSchool 2.0</p>
    </div>
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
