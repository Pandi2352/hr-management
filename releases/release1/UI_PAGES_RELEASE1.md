# PeopleOS — Release 1: UI Pages List & Inventory

This document defines the complete list of frontend UI pages, views, modals, and drawers required specifically for **Release 1 (Foundation)**.

---

## 1. Authentication & Security Pages

### 1.1 `LoginPage` (`/auth/login`)
- Email & password input fields with client validation.
- "Remember me" checkbox and "Forgot password?" link.
- Rate limit feedback and account lockout error alerts.
- Redirection to intended dashboard upon successful authentication.

### 1.2 `ForgotPasswordPage` (`/auth/forgot-password`)
- Email address input with instant validation.
- Clear instruction card for password recovery link dispatch.
- Success state with "Resend email" countdown timer.

### 1.3 `ResetPasswordPage` (`/auth/reset-password`)
- Token-validated password reset form.
- Real-time password strength meter (Uppercase, Lowercase, Number, Symbol, 8+ chars).
- Password confirmation match validation.

### 1.4 `AcceptInvitePage` (`/auth/accept-invite`)
- Welcome header showing organization name and assigned work email.
- Account password setup and terms/policy acknowledgment.
- Direct redirection to `MyProfilePage` upon activation.

### 1.5 `LockoutPage` (`/auth/locked`)
- Account locked warning banner citing 5 failed attempts.
- Instructions to contact HR administrator or wait for 30-minute security timeout.

---

## 2. Organization Management Pages

### 2.1 `OrganizationProfilePage` (`/organization/profile`)
- Company legal name, trade name, registration code, corporate tax ID.
- Primary contact information, corporate email, phone, website URL.
- Base settings: standard working timezone, primary currency, fiscal year definition.

### 2.2 `DepartmentsPage` (`/organization/departments`)
- Tabular and card view of all active departments.
- Columns: Department Name, Code, Department Head, Member Count, Cost Center, Status.
- Search, filter by status (`ACTIVE`, `INACTIVE`), and quick-action menu (Edit, Deactivate).

### 2.3 `DepartmentTreePage` (`/organization/departments/tree`)
- Interactive visual hierarchical tree of departments and child sub-departments.
- Node zoom, expand/collapse, and drag-and-drop hierarchy adjustments.
- Department detail drawer on node click showing head of department and active staff.

### 2.4 `DesignationsPage` (`/organization/designations`)
- Standardized job titles catalog.
- Columns: Title, Code, Grade / Seniority Level ($1$ to $10$), Assigned Employee Count, Status.
- Create / Edit designation modal with grade-level slider.

### 2.5 `LocationsPage` (`/organization/locations`)
- Company office branches and physical facilities.
- Columns: Location Name, City, Country, Timezone, Employee Count, Status.
- Add/Edit location modal with Google Maps or address autocompletion.

### 2.6 `CostCentersPage` (`/organization/cost-centers`)
- Financial cost center repository for departmental budgeting.
- Columns: Cost Center Code, Name, Allocated Department, Status.

---

## 3. Employee Master Record & Directory Pages

### 3.1 `EmployeeDirectoryPage` (`/employees`)
- Dual-mode view: **Grid Cards** (with avatars & job title) or **Data Table** (high density).
- Global fuzzy search bar (name, email, code).
- Multi-dimensional filters: Department, Designation, Location, Employment Type, Status.
- Bulk export button (CSV/Excel) and "Add Employee" primary action.

### 3.2 `EmployeeCreatePage` (`/employees/new`)
- Multi-step wizard or tabbed creation form:
  - *Step 1: Identity & Personal Information*
  - *Step 2: Employment & Department Assignment*
  - *Step 3: Contact & Emergency Details*
  - *Step 4: Compensation Grade & Initial Role*
  - *Step 5: Review & Send Portal Invitation*

### 3.3 `EmployeeDetailPage` (`/employees/:id`)
- Comprehensive tabbed view:
  - **Tab 1: Overview**: Core stats, quick contact, reporting line hierarchy widget.
  - **Tab 2: Personal & Contact**: Address details, marital status, emergency contact cards.
  - **Tab 3: Employment**: Employee code, joining date, tenure counter, manager, direct reports.
  - **Tab 4: Education & Experience**: Timeline of degrees, past employers, and verified roles.
  - **Tab 5: Skills**: Tag cloud with proficiency badges (`BEGINNER`, `EXPERT`).
  - **Tab 6: Document Vault**: Secure file list with download and verification badges.
  - **Tab 7: Audit History**: Timeline of changes made to this specific employee record.

### 3.4 `EmployeeEditPage` (`/employees/:id/edit`)
- Full edit mode with dirty form warnings and change confirmation modal.

---

## 4. User Management & Security Pages

### 4.1 `UsersListPage` (`/security/users`)
- Roster of all system user accounts.
- Columns: User Email, Linked Employee Name, Assigned Roles, Status (`ACTIVE`, `SUSPENDED`, `LOCKED`), Last Login.
- Action dropdown: "Assign Role", "Suspend User", "Reset Password", "Unlock Account".

### 4.2 `RolesPermissionsPage` (`/security/roles`)
- Role cards (`SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`, plus custom roles).
- Clickable role detail opening the **Permission Matrix**.

### 4.3 `RoleCreateEditPage` (`/security/roles/:id`)
- Interactive permission matrix table grouped by resource:
  - *Employee*: View, Create, Update, Delete, Export.
  - *Organization*: View, Manage.
  - *User & Role*: View, Manage.
  - *Audit*: View, Export.
- Toggle switches per action with select-all options.

### 4.4 `SecuritySettingsPage` (`/security/settings`)
- Password complexity enforcement rules.
- Session timeout thresholds (inactivity logout minutes).
- Account lockout parameters (max failed attempts, lockout duration).

---

## 5. Governance & Audit Pages

### 5.1 `AuditLogsPage` (`/audit/logs`)
- Searchable forensic audit trail.
- Columns: Timestamp, Actor, Resource, Action (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`), Client IP.
- Detail drawer: JSON / Side-by-Side Diff showing `old_value` vs `new_value`.

### 5.2 `LoginHistoryPage` (`/audit/login-history`)
- Real-time stream of all authentication events (Success, Failure, Lockout).
- Columns: Email, Timestamp, IP Address, User Agent, Device Type, Status.

---

## 6. Portals & Dashboards

### 6.1 `HRDashboardPage` (`/dashboard/hr`)
- Overview metrics: Total Headcount, New Joiners (This Month), Active Departments, Pending User Invites.
- Headcount breakdown by Department (Donut chart).
- Recent administrative activity feed.

### 6.2 `EmployeeDashboardPage` (`/dashboard/employee`)
- Welcome header with personalized profile completion meter.
- My Profile snapshot and quick links to company directory and holiday calendar.
- Company announcement cards.

### 6.3 `MyProfilePage` (`/profile`)
- Self-service view allowing employees to view their records and edit personal contact information.
- Password change modal and active session management.

---

## 7. Error & System Utility Views

- `NotFound404Page`: Clean illustration with "Back to Dashboard" button.
- `Forbidden403Page`: Security badge notifying lack of RBAC permission with "Request Access" button.
- `ServerError500Page`: Graceful crash handler with diagnostic error reference code.
