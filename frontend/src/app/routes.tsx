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
import { MyEmployeeDetailPage, MyEmployeeEditPage } from "../features/employees/pages/MyEmployeePages";
import { UsersListPage } from "../features/security/pages/UsersListPage";
import { RolesPermissionsPage } from "../features/security/pages/RolesPermissionsPage";
import { RoleCreateEditPage } from "../features/security/pages/RoleCreateEditPage";
import { SecuritySettingsPage } from "../features/security/pages/SecuritySettingsPage";
import { BusinessSettingsPage } from "../features/settings/pages/BusinessSettingsPage";
import { AiProvidersPage } from "../features/ai/pages/AiProvidersPage";
import { AuditLogsPage } from "../features/audit/pages/AuditLogsPage";
import { LoginHistoryPage } from "../features/audit/pages/LoginHistoryPage";
import { AttendancePage } from "../features/attendance/pages/AttendancePage";
import { HolidayCalendarPage } from "../features/holidays/pages/HolidayCalendarPage";
import { HolidaysManagePage } from "../features/holidays/pages/HolidaysManagePage";
import { RecruitmentPage } from "../features/recruitment/pages/RecruitmentPage";
import { PayrollPage } from "../features/payroll/pages/PayrollPage";
import { AtriumDirectoryPage } from "../features/atrium/pages/AtriumDirectoryPage";
import { AtriumProfilePage } from "../features/atrium/pages/AtriumProfilePage";
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
import { AgentsHubPage } from "../features/agents/pages/AgentsHubPage";
import { QuizAgentPage } from "../features/agents/pages/QuizAgentPage";
import { QuizHubPage } from "../features/quiz/pages/QuizHubPage";
import { QuizPlayPage } from "../features/quiz/pages/QuizPlayPage";
import { PracticePage } from "../features/quiz/pages/PracticePage";
import { AttemptReviewPage } from "../features/quiz/pages/AttemptReviewPage";

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
          // Self-service: any authenticated user may open these; the backend
          // allows HR/admins everywhere and employees only on their own file
          // (isSelfServiceUser check), returning 403 otherwise.
          {
            path: ":id",
            element: <EmployeeDetailPage />,
          },
          {
            path: ":id/edit",
            element: <EmployeeEditPage />,
          },
          {
            path: ":id/timeline",
            element: (
              <RoleGuard allowedRoles={[...ADMIN_ROLES, "EMPLOYEE"]}>
                <EmployeeLifecycleTimelinePage />
              </RoleGuard>
            ),
          },
        ],
      },
      // Convenience self-service routes — resolve the logged-in employee file
      // then hand off to the full detail/edit pages above.
      {
        path: "my-employee",
        children: [
          {
            index: true,
            element: <MyEmployeeDetailPage />,
          },
          {
            path: "edit",
            element: <MyEmployeeEditPage />,
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
        path: "holidays",
        children: [
          {
            index: true,
            element: <HolidayCalendarPage />,
          },
          {
            path: "manage",
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <HolidaysManagePage />
              </RoleGuard>
            ),
          },
        ],
      },
      {
        // Atrium is open to everyone who can sign in — the permission check
        // lives on the API, and gating it by role here would defeat the point.
        path: "atrium",
        children: [
          { index: true, element: <AtriumDirectoryPage /> },
          { path: ":employeeId", element: <AtriumProfilePage /> },
        ],
      },
      {
        // AI Agents Hub - accessible to all authorized employees
        path: "agents",
        children: [
          { index: true, element: <AgentsHubPage /> },
          { path: "quiz", element: <QuizAgentPage /> },
        ],
      },
      {
        // Quiz Arena & Gamification
        path: "quizzes",
        children: [
          { index: true, element: <QuizHubPage /> },
          { path: ":id/play", element: <QuizPlayPage /> },
          // The targeted retry from the learning loop. Sits beside play rather
          // than under a quiz id, because a practice set outlives the attempt
          // that produced it and is addressed by its own id.
          { path: "practice/:practiceId", element: <PracticePage /> },
          // One attempt, explained. Addressed by attempt rather than by quiz,
          // because the record is of a sitting and outlives the quiz's edits.
          { path: "attempts/:attemptId", element: <AttemptReviewPage /> },
        ],
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
            path: "ai-providers",
            element: (
              <RoleGuard allowedRoles={["SUPER_ADMIN", "HR_ADMIN"]}>
                <AiProvidersPage />
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
