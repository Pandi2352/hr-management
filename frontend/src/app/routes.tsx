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
import { OrgChartPage } from "../features/organization/pages/OrgChartPage";
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
import { BusinessSettingsPage } from "../features/settings/pages/BusinessSettingsPage";
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
import { OnboardingTrackerPage } from "../features/lifecycle/pages/OnboardingTrackerPage";
import { OnboardingChecklistDetailPage } from "../features/lifecycle/pages/OnboardingChecklistDetailPage";
import { EmployeeSelfOnboardingPage } from "../features/lifecycle/pages/EmployeeSelfOnboardingPage";
import { ProbationTrackerPage } from "../features/lifecycle/pages/ProbationTrackerPage";
import { PromotionsTransfersPage } from "../features/lifecycle/pages/PromotionsTransfersPage";
import { EmployeeLifecycleTimelinePage } from "../features/lifecycle/pages/EmployeeLifecycleTimelinePage";
import { UnauthorizedPage } from "../pages/UnauthorizedPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProtectedRoute, PublicRoute, RoleGuard } from "../features/auth/guards/AuthGuards";

const ADMIN_ROLES = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"];

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
            element: (
              <RoleGuard allowedRoles={ADMIN_ROLES}>
                <EmployeeDirectoryPage />
              </RoleGuard>
            ),
          },
          {
            path: "chart",
            element: <OrgChartPage />,
          },
          {
            path: "new",
            element: (
              <RoleGuard allowedRoles={ADMIN_ROLES}>
                <EmployeeCreatePage />
              </RoleGuard>
            ),
          },
          {
            path: ":id",
            element: (
              <RoleGuard allowedRoles={ADMIN_ROLES}>
                <EmployeeDetailPage />
              </RoleGuard>
            ),
          },
          {
            path: ":id/edit",
            element: (
              <RoleGuard allowedRoles={ADMIN_ROLES}>
                <EmployeeEditPage />
              </RoleGuard>
            ),
          },
          {
            path: ":id/timeline",
            element: (
              <RoleGuard allowedRoles={ADMIN_ROLES}>
                <EmployeeLifecycleTimelinePage />
              </RoleGuard>
            ),
          },
        ],
      },
      {
        path: "lifecycle",
        children: [
          {
            path: "onboarding",
            children: [
              {
                index: true,
                element: <OnboardingTrackerPage />,
              },
              {
                path: ":id",
                element: <OnboardingChecklistDetailPage />,
              },
            ],
          },
          {
            path: "probation",
            element: <ProbationTrackerPage />,
          },
          {
            path: "transitions",
            element: <PromotionsTransfersPage />,
          },
        ],
      },
      {
        path: "onboarding/wizard",
        element: <EmployeeSelfOnboardingPage />,
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
        element: (
          <RoleGuard allowedRoles={ADMIN_ROLES}>
            <PayrollPage />
          </RoleGuard>
        ),
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
            path: "chart",
            element: <OrgChartPage />,
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
        children: [
          {
            index: true,
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <BusinessSettingsPage />
              </RoleGuard>
            ),
          },
          {
            path: "business",
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <BusinessSettingsPage />
              </RoleGuard>
            ),
          },
          {
            path: "security",
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <SecuritySettingsPage />
              </RoleGuard>
            ),
          },
        ],
      },
      {
        path: "audit",
        children: [
          {
            index: true,
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <AuditLogsPage />
              </RoleGuard>
            ),
          },
          {
            path: "logs",
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <AuditLogsPage />
              </RoleGuard>
            ),
          },
          {
            path: "login-history",
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <LoginHistoryPage />
              </RoleGuard>
            ),
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
