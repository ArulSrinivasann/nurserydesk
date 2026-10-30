import { RequireRole } from '@/app/guards/RequireRole'
import { AppShell } from '@/app/layouts/AppShell'
import { useSession } from '@/app/session'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdmissionWizardPage } from '@/features/admissions/AdmissionWizardPage'
import { AdmissionsPage } from '@/features/admissions/AdmissionsPage'
import { ClassesPage } from '@/features/classes/ClassesPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DesignPage } from '@/features/design/DesignPage'
import { IconPickerPage } from '@/features/design/IconPickerPage'
import { EnquiriesPage } from '@/features/enquiries/EnquiriesPage'
import { CollectPaymentPage } from '@/features/fees/CollectPaymentPage'
import { InvoicesPage } from '@/features/fees/InvoicesPage'
import { OtherFeesPage } from '@/features/fees/OtherFeesPage'
import { ParentFeesPage } from '@/features/parent/ParentFeesPage'
import { ParentHomePage } from '@/features/parent/ParentHomePage'
import { LandingPage } from '@/features/marketing/LandingPage'
import { DemoRequestsPage } from '@/features/schools/DemoRequestsPage'
import { PlatformPlansPage, PlatformSchoolsPage } from '@/features/schools/PlatformPages'
import { SchoolProfilePage } from '@/features/schools/SchoolProfilePage'
import { AttendancePage } from '@/features/attendance/AttendancePage'
import { DailyUpdatesPage } from '@/features/attendance/DailyUpdatesPage'
import { ProgressPage } from '@/features/progress/ProgressPage'
import { ProgressReportPage } from '@/features/progress/ProgressReportPage'
import { MessagesPage } from '@/features/messages/MessagesPage'
import { AttendanceReportPage } from '@/features/reports/AttendanceReportPage'
import { StudentsPage } from '@/features/students/StudentsPage'
import { AssignClassPage } from '@/features/users/AssignClassPage'
import { StaffCreationPage } from '@/features/users/StaffCreationPage'
import { UserManagementPage } from '@/features/users/UserManagementPage'
import { ROLE_HOME } from '@/types/roles'
import { Navigate, Route, Routes } from 'react-router-dom'

function RoleRedirect() {
  const { user, loading } = useSession()
  if (loading) {
    return <p className="p-6 text-muted">Loading…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={ROLE_HOME[user.role]} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/app" element={<RoleRedirect />} />
      <Route element={<AppShell />}>
        <Route element={<RequireRole roles={['school_admin']} />}>
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/icons" element={<IconPickerPage />} />
          <Route path="/admin/school" element={<SchoolProfilePage />} />
          <Route path="/admin/classes" element={<ClassesPage />} />
          <Route path="/admin/students" element={<StudentsPage />} />
          <Route path="/admin/admissions" element={<AdmissionsPage />} />
          <Route path="/admin/admissions/new" element={<AdmissionWizardPage />} />
          <Route path="/admin/enquiries" element={<EnquiriesPage />} />
          <Route path="/admin/fees" element={<InvoicesPage />} />
          <Route path="/admin/fees/other" element={<OtherFeesPage />} />
          <Route path="/admin/fees/collect" element={<CollectPaymentPage />} />
          <Route path="/admin/reports/attendance" element={<AttendanceReportPage />} />
          <Route path="/admin/messages" element={<MessagesPage />} />
          <Route path="/admin/users/staff" element={<StaffCreationPage />} />
          <Route path="/admin/users/assign" element={<AssignClassPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Route>
        <Route element={<RequireRole roles={['teacher']} />}>
          <Route path="/teacher/attendance" element={<AttendancePage />} />
          <Route path="/teacher/updates" element={<DailyUpdatesPage />} />
          <Route path="/teacher/progress" element={<ProgressPage />} />
          <Route path="/teacher/reports" element={<ProgressReportPage />} />
        </Route>
        <Route element={<RequireRole roles={['parent']} />}>
          <Route path="/parent/home" element={<ParentHomePage />} />
          <Route path="/parent/fees" element={<ParentFeesPage />} />
        </Route>
        <Route element={<RequireRole roles={['super_admin']} />}>
          <Route path="/platform/demos" element={<DemoRequestsPage />} />
          <Route path="/platform/schools" element={<PlatformSchoolsPage />} />
          <Route path="/platform/plans" element={<PlatformPlansPage />} />
        </Route>
      </Route>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
