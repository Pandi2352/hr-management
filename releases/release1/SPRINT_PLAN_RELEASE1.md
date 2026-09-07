# PeopleOS — Release 1: Sprint Plan & Work Breakdown Structure

This sprint plan breaks down **Release 1 (Foundation)** into 4 structured, 2-week engineering sprints with clear deliverables, technical dependencies, and exit criteria.

---

## 1. Sprint Cadence Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RELEASE 1 SPRINT TIMELINE (8 WEEKS)                      │
├───────────────────────┬───────────────────────┬─────────────────────────────┤
│ SPRINT 1 (Weeks 1-2)  │ SPRINT 2 (Weeks 3-4)  │ SPRINT 3 (Weeks 5-6)        │
│ Auth, Identity & RBAC │ Org Hierarchy & Master│ Employee Directory & Vault  │
├───────────────────────┴───────────────────────┼─────────────────────────────┤
│ SPRINT 4 (Weeks 7-8)                          │ INTEGRATION & HARDENING     │
│ Audit Logging, Dashboards & Acceptance E2E    │ Final Release Candidate (RC)│
└───────────────────────────────────────────────┴─────────────────────────────┘
```

---

## 2. Sprint 1: Identity, Authentication & Security (Weeks 1–2)

### 2.1 Sprint Goal
Establish rock-solid user authentication, session security, password policies, and the core RBAC framework in NestJS and MongoDB.

### 2.2 User Stories & Engineering Tasks
- [ ] **US-101 (BE)**: Implement `users` and `sessions` Mongoose schemas with password hashing via `bcrypt` (12 rounds).
- [ ] **US-102 (BE)**: Implement `/api/v1/auth/login` returning 15-minute access token and setting 7-day HTTP-only refresh cookie.
- [ ] **US-103 (BE)**: Implement `/api/v1/auth/refresh` and `/api/v1/auth/logout` with session blacklisting.
- [ ] **US-104 (BE)**: Implement account lockout logic (5 failed attempts locks account for 30 minutes).
- [ ] **US-105 (BE)**: Implement `JwtAuthGuard` and `@Roles()` / `@Permissions()` decorators.
- [ ] **US-106 (FE)**: Build `LoginPage` (`/auth/login`) with form validation and loading/error states.
- [ ] **US-107 (FE)**: Build `ForgotPasswordPage` and `ResetPasswordPage` with password strength indicator.
- [ ] **US-108 (FE)**: Setup `useAuth` hook and Axios interceptor for transparent JWT refresh.

### 2.3 Exit Deliverable
Users can log in, receive JWT tokens, refresh sessions automatically, and unauthorized routes are blocked by `JwtAuthGuard`.

---

## 3. Sprint 2: Organization Hierarchy & Setup (Weeks 3–4)

### 3.1 Sprint Goal
Allow administrators to configure company profiles, multi-tier departments, designations, branches, and cost centers.

### 3.2 User Stories & Engineering Tasks
- [ ] **US-201 (BE)**: Create `organizations`, `departments`, and `designations` Mongoose schemas with compound unique indexes (`organizationId + code`).
- [ ] **US-202 (BE)**: Implement CRUD endpoints for `/api/v1/departments` including parent-child tree aggregation (`$graphLookup`).
- [ ] **US-203 (BE)**: Implement CRUD endpoints for `/api/v1/designations` with grade levels ($1$–$10$).
- [ ] **US-204 (BE)**: Implement `/api/v1/locations` for physical branch office setups.
- [ ] **US-205 (FE)**: Build `OrganizationProfilePage` (`/organization/profile`) with company settings form.
- [ ] **US-206 (FE)**: Build `DepartmentsPage` (`/organization/departments`) with table, search, and Add/Edit Department modal.
- [ ] **US-207 (FE)**: Build `DepartmentTreePage` (`/organization/departments/tree`) with interactive visual hierarchy nodes.
- [ ] **US-208 (FE)**: Build `DesignationsPage` (`/organization/designations`) with grade sliders.

### 3.3 Exit Deliverable
Organization administrators can model their complete departmental hierarchy and job titles visually and via REST APIs.

---

## 4. Sprint 3: Employee Master Record & Document Vault (Weeks 5–6)

### 4.1 Sprint Goal
Deliver the master employee directory, multi-tabbed profile view, and secure document storage.

### 4.2 User Stories & Engineering Tasks
- [ ] **US-301 (BE)**: Create `employees` schema with embedded sub-documents (`emergencyContacts`, `education`, `experience`, `skills`, `documents`).
- [ ] **US-302 (BE)**: Implement `/api/v1/employees` endpoint with cursor/offset pagination, fuzzy search, and multi-field filtering.
- [ ] **US-303 (BE)**: Implement `/api/v1/employees/:id` with complete profile population.
- [ ] **US-304 (BE)**: Implement document upload endpoint (`/api/v1/employees/:id/documents`) with MIME type and size validation.
- [ ] **US-305 (FE)**: Build `EmployeeDirectoryPage` (`/employees`) supporting both Grid Cards and Data Table views with instant search.
- [ ] **US-306 (FE)**: Build `EmployeeCreatePage` (`/employees/new`) multi-step wizard.
- [ ] **US-307 (FE)**: Build `EmployeeDetailPage` (`/employees/:id`) with tabbed sections (Overview, Personal, Employment, Skills, Documents, Audit).
- [ ] **US-308 (FE)**: Build `DocumentUploadCard` and `DocumentPreviewModal`.

### 4.3 Exit Deliverable
HR can add, search, filter, update, and inspect employee profiles with attached verified documents.

---

## 5. Sprint 4: Audit Logs, Dashboards & Hardening (Weeks 7–8)

### 5.1 Sprint Goal
Finalize non-blocking audit logging, role permission matrix, role-tailored dashboards, and end-to-end integration testing.

### 5.2 User Stories & Engineering Tasks
- [ ] **US-401 (BE)**: Implement `AuditLogInterceptor` capturing `actor`, `clientIp`, `action`, `resource`, `old_value`, and `new_value`.
- [ ] **US-402 (BE)**: Implement `/api/v1/audit/logs` and `/api/v1/audit/login-history` query endpoints.
- [ ] **US-403 (FE)**: Build `AuditLogsPage` (`/audit/logs`) with side-by-side JSON diff drawer.
- [ ] **US-404 (FE)**: Build `RolesPermissionsPage` and interactive `PermissionMatrixTable`.
- [ ] **US-405 (FE)**: Build `HRDashboardPage` (`/dashboard/hr`) and `EmployeeDashboardPage` (`/dashboard/employee`).
- [ ] **US-406 (QA)**: Execute full acceptance test suite (TC-MVP-01 through TC-MVP-10).
- [ ] **US-407 (DevOps)**: Finalize Docker Compose deployment and verify zero TypeScript / ESLint errors.

### 5.3 Exit Deliverable
Release 1 is fully functional, audited, tested, and ready for production deployment as the baseline for Release 2.
