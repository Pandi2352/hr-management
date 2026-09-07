import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Dashboard } from "../features/dashboard/Dashboard";
import { EmployeeDashboard } from "../features/dashboard/EmployeeDashboard";
import { LoginPage } from "../features/auth/LoginPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { AcceptInvitePage } from "../features/auth/AcceptInvitePage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { OrganizationProfilePage } from "../features/organization/pages/OrganizationProfilePage";
import { DepartmentsPage } from "../features/organization/pages/DepartmentsPage";
import { DepartmentTreePage } from "../features/organization/pages/DepartmentTreePage";
import { DesignationsPage } from "../features/organization/pages/DesignationsPage";
import { LocationsPage } from "../features/organization/pages/LocationsPage";
import { CostCentersPage } from "../features/organization/pages/CostCentersPage";
import { EmployeeDirectoryPage } from "../features/employees/pages/EmployeeDirectoryPage";
import { EmployeeCreatePage } from "../features/employees/pages/EmployeeCreatePage";
import { EmployeeDetailPage } from "../features/employees/pages/EmployeeDetailPage";
import { EmployeeEditPage } from "../features/employees/pages/EmployeeEditPage";
import { UsersListPage } from "../features/security/pages/UsersListPage";
import { RolesPermissionsPage } from "../features/security/pages/RolesPermissionsPage";
import { RoleCreateEditPage } from "../features/security/pages/RoleCreateEditPage";
import { SecuritySettingsPage } from "../features/security/pages/SecuritySettingsPage";
import { AuditLogsPage } from "../features/audit/pages/AuditLogsPage";
import { LoginHistoryPage } from "../features/audit/pages/LoginHistoryPage";
import { AttendancePage } from "../features/attendance/pages/AttendancePage";
import { RecruitmentPage } from "../features/recruitment/pages/RecruitmentPage";
import { PayrollPage } from "../features/payroll/pages/PayrollPage";
import { LeavePage } from "../features/leave/pages/LeavePage";
import { ContactsPage } from "../features/contacts/pages/ContactsPage";
import { PublicCareersLayout } from "../features/careers/layout/PublicCareersLayout";
import { CareersPage } from "../features/careers/pages/CareersPage";
import { ContactUsPage } from "../features/careers/pages/ContactUsPage";
import { UnauthorizedPage } from "../pages/UnauthorizedPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProtectedRoute, PublicRoute } from "../features/auth/guards/AuthGuards";

export const router = createBrowserRouter([
  {
    path: "/careers",
    element: <PublicCareersLayout />,
    children: [
      {
        index: true,
        element: <CareersPage />,
      },
      {
        path: "contact",
        element: <ContactUsPage />,
      },
      {
        path: ":jobId",
        element: <CareersPage />,
      },
    ],
  },
  {
    path: "/contact",
    element: <PublicCareersLayout />,
    children: [
      {
        index: true,
        element: <ContactUsPage />,
      },
    ],
  },
  {
    path: "/auth",
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "accept-invite",
        element: <AcceptInvitePage />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "dashboard",
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "hr",
            element: <Dashboard />,
          },
          {
            path: "employee",
            element: <EmployeeDashboard />,
          },
        ],
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "employees",
        children: [
          {
            index: true,
            element: <EmployeeDirectoryPage />,
          },
          {
            path: "new",
            element: <EmployeeCreatePage />,
          },
          {
            path: ":id",
            element: <EmployeeDetailPage />,
          },
          {
            path: ":id/edit",
            element: <EmployeeEditPage />,
          },
        ],
      },
      {
        path: "contacts",
        element: <ContactsPage />,
      },
      {
        path: "recruitment",
        element: <RecruitmentPage />,
      },
      {
        path: "attendance",
        element: <AttendancePage />,
      },
      {
        path: "leave",
        element: <LeavePage />,
      },
      {
        path: "payroll",
        element: <PayrollPage />,
      },
      {
        path: "approvals",
        element: (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Approvals Inbox</h2>
            <p className="text-xs text-slate-500 mt-1">Centralized pending requests and workflow approval center.</p>
          </div>
        ),
      },
      {
        path: "organization",
        children: [
          {
            index: true,
            element: <DepartmentsPage />,
          },
          {
            path: "profile",
            element: <OrganizationProfilePage />,
          },
          {
            path: "departments",
            element: <DepartmentsPage />,
          },
          {
            path: "departments/tree",
            element: <DepartmentTreePage />,
          },
          {
            path: "designations",
            element: <DesignationsPage />,
          },
          {
            path: "locations",
            element: <LocationsPage />,
          },
          {
            path: "cost-centers",
            element: <CostCentersPage />,
          },
        ],
      },
      {
        path: "security",
        children: [
          {
            index: true,
            element: <UsersListPage />,
          },
          {
            path: "users",
            element: <UsersListPage />,
          },
          {
            path: "roles",
            element: <RolesPermissionsPage />,
          },
          {
            path: "roles/new",
            element: <RoleCreateEditPage />,
          },
          {
            path: "roles/:id",
            element: <RoleCreateEditPage />,
          },
          {
            path: "settings",
            element: <SecuritySettingsPage />,
          },
        ],
      },
      {
        path: "settings",
        element: <SecuritySettingsPage />,
      },
      {
        path: "audit",
        children: [
          {
            index: true,
            element: <AuditLogsPage />,
          },
          {
            path: "logs",
            element: <AuditLogsPage />,
          },
          {
            path: "login-history",
            element: <LoginHistoryPage />,
          },
        ],
      },
      {
        path: "403",
        element: <UnauthorizedPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/403",
    element: <UnauthorizedPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
