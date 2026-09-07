# User Management & Access Governance Module — Complete Feature Checklist
**Release Target**: Release 1 (`v1.0.0`)  
**Scope**: Enterprise User Administration, Invitation Engine (Managers, HR, Admins), Role-Based Access Control (RBAC), and Security Governance  
**Strict Domain Distinction**:
> **Note on Architecture Separation**:
> - **Standard Employees** are governed inside the **Employee Module** (`/employees`) with their personnel records, department assignments, CTC, documents, and standard employee self-service logins.
> - **User Management** (`/security/users`) is strictly reserved for **System User Accounts & Enterprise Operators**: Super Administrators, HR Administrators, Department Managers, IT Security Officers, and Compliance Auditors who hold elevated permissions to configure, manage, and supervise the PeopleOS platform.

---

## 1. User Invitation & Onboarding Workflow (Admin / HR / Manager)

Unlike regular employees who are onboarded via the HR Employee Wizard, Enterprise Users (Admins, HR Managers, Department Leads) are formally invited into the administrative console.

### 1.1 Invitation Creation & Dispatch
- [x] **"Invite Administrative User" Modal / Action**:
  - Direct action button on `/security/users`.
  - Input: Work Email address.
  - Input: First Name & Last Name.
  - Select: Initial Role Assignment (any system or custom role).
  - Select: Invitation Expiry Threshold (24 hours, 48 hours, or 7 days).
  - ⏳ Not implemented: linking to an existing unlinked Employee record, and department/organization scope-of-authority selection (tracked under Phase 3).
- [x] **Cryptographic Invitation Token Engine**:
  - Secure, single-use, cryptographically signed token (32-byte random token, bcrypt-hashed at rest — hash is never returned by the API).
  - Stored in database with timestamp, creator ID, expiry date, and status (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`).
- [x] **Automated Branded Invitation Email**:
  - Automated HTML email dispatch via nodemailer.
  - Branded header with PeopleOS identity.
  - Contextual copy naming the inviter and assigned role.
  - Clear Call-to-Action (CTA): "Accept Invitation & Set Password".
  - Security disclaimer and expiry notice.

### 1.2 Invitation Lifecycle Management
- [x] **Pending Invitations Tab / Filter**:
  - Dedicated tab on `/security/users` for outstanding invitations.
  - Columns: Invitee, Role, Invited By, Sent Date, Expiration, Status.
- [x] **Resend Invitation**:
  - One-click trigger to generate a fresh token, update expiration, and re-dispatch the invitation email.
  - Rate limited to a maximum of 3 resends per 24 hours per invitation.
- [x] **Revoke / Cancel Invitation**:
  - Instant invalidation of pending invitation tokens so the link cannot be used.
- [x] **Auto-Expiration Daemon / Cleanup**:
  - Implemented as a lazy sweep (stale `PENDING` invitations are flipped to `EXPIRED` on every list/validate call) rather than a separate scheduled process — no new background-job infrastructure exists in this codebase yet.

### 1.3 Invitation Acceptance & Account Activation Flow
- [x] **Public Activation Route (`/auth/accept-invite?token=...`)**:
  - Verification of token validity, unexpired status, and matching recipient.
  - Distinct error screens for invalid, expired, and already-accepted tokens.
- [x] **Account Setup Form**:
  - Displays non-editable invited email and assigned role.
  - Password creation with live password policy meter (Length, Uppercase, Lowercase, Numbers, Special characters).
  - Confirm Password matching validation.
  - Terms of Service & Security Policy consent checkbox.
  - ⏳ Not implemented: editable full name entry (name is fixed at invite-creation time in this simplified flow).
- [x] **Seamless First-Time Sign-In**:
  - On activation, the account is marked `ACTIVE`, `acceptedAt` is recorded, an `INVITATION_ACCEPTED` audit event is logged, and session tokens are issued immediately (same JWT/refresh-token/session flow as password login).

---

## 2. User Accounts Roster & Management (`/security/users`)

Complete control over all provisioned administrative and management accounts.

### 2.1 User Directory Table & Metrics
- [x] **Top Metric Counters**:
  - Total Active Accounts.
  - Pending Invitations.
  - Suspended Accounts.
  - Locked Accounts (due to failed logins).
  - Active Admins & Managers count.
- [x] **Rich Data Table Columns**:
  - User Identity: Avatar, Full Name, Work Email, Linked Employee Code chip.
  - Assigned Roles: Colored badges.
  - Linked Employee Profile: Quick link to their HR record (if associated).
  - Account Status: `ACTIVE`, `INVITED`, `SUSPENDED`, `LOCKED`, `INACTIVE`.
  - Last Activity / Last Login timestamp.
  - Security Flags: Failed login attempts counter.
  - ⏳ Not implemented: MFA status badge (no 2FA/MFA feature exists yet — tracked under §4.4).
- [x] **Filter & Search Controls**:
  - Fuzzy search by Name or Email.
  - Role filter dropdown.
  - Account Status filter dropdown.
  - Server-side pagination with controlled page size options.

### 2.2 User Action Controls (Per Row & Batch)
- [x] **Role Assignment & Scope Modifier**:
  - Modal to add/remove roles dynamically (`AssignRoleModal`), with `user.permissions` kept in sync with the assigned roles' permission sets.
  - Scope assignment: when a Manager role is selected, the modal exposes a department multi-select that writes `user.departmentScope`.
  - Safeguard: Prevent removing the last remaining Super Admin from the organization.
- [x] **Suspend / Activate Toggle**:
  - Instant account suspension/reactivation with audit logging (`ACCOUNT_SUSPENDED` / `ACCOUNT_ACTIVATED`).
- [x] **Unlock Locked Accounts**:
  - Direct action for users locked out by brute-force protection.
  - Resets failed attempt counter to 0 and clears lock timestamp.
- [x] **Manual Password Reset Dispatch**:
  - Sends a secure password reset link directly to the user's verified work email.
- [ ] **Force Password Reset on Next Login**:
  - Flag forcing the user to change their password immediately upon their next authentication. Deferred — needs a login-interception UX.
- [x] **Terminate All Active Sessions**:
  - Admin trigger (separate from the existing self-service "log out everywhere") to invalidate all active refresh tokens/sessions for a specific user.

---

## 3. Role-Based Access Control (RBAC) & Permission Matrix (`/security/roles`)

Fine-grained authorization governing what each managerial and administrative tier can view, create, edit, approve, or delete.

### 3.1 Standard & System Default Roles
- [x] **Super Administrator (`super_admin`)**:
  - Immutable system role, seeded on first boot. `PermissionsGuard` short-circuits to full access for this role regardless of its permission list.
- [x] **HR Administrator (`hr_admin`)**:
  - Seeded with employee lifecycle, organization, and read-only user/audit permissions.
- [x] **Department Manager (`manager`)**:
  - Seeded with read-only employee/organization visibility, **scoped to their own department subtree** (see Phase 3 below).
- [ ] **Compliance & Audit Officer (`auditor`)**:
  - Not implemented — no such role is seeded, and there's no `/audit/logs` page yet for it to be read-only over (Phase 4).
- [x] **Custom Roles Engine**:
  - `POST /users/roles` + "Create Custom Role" on `/security/roles` — arbitrary org-specific roles with their own permission sets.

### 3.2 Granular Permission Matrix Table (`/security/roles/:id`)
- [x] **Implemented at full spec granularity — 21 canonical permissions.** Defined once in `backend/src/common/constants/permissions.constant.ts` and mirrored in the frontend's `PERMISSION_GROUPS`:
  - **Employee**: `employee:read`, `employee:create`, `employee:update`, `employee:delete`, `employee:status`, `employee:compensation`, `employee:export`
  - **Organization**: `org:profile:read`, `org:profile:write`, `org:departments:manage`, `org:designations:manage`, `org:locations:manage`, `org:cost_centers:manage`
  - **Users & Security**: `users:read`, `users:invite`, `users:manage`, `roles:manage`, `security:policy:manage`
  - **Audit**: `audit:read`, `audit:export`, `audit:login_history`
  - Roles can now express distinctions the coarse set couldn't, e.g. "may invite users but not suspend them" or "may manage departments but not designations" — verified end-to-end.
  - ⏳ `employee:compensation` is defined and assignable but currently gates nothing: the Employee schema has **no** salary/CTC/bank fields yet. It becomes enforcing the moment compensation data lands.
  - **Fixed along the way**: `@RequirePermissions()` decorators previously used a dot convention (`employee.read`, `department.create`) while roles granted colon keys (`employee:view`) — they could never match, so every employee/organization endpoint was effectively closed to any non-wildcard, non-super-admin account. All decorators and stored keys now use the one canonical catalog, and a boot-time migration rewrites legacy keys on existing roles/users (`user:manage` correctly fans out to `users:manage` + `users:invite` + `roles:manage` + `security:policy:manage`).

### 3.3 Interactive Matrix Controls
- [x] **Group Level Quick Toggles**:
  - "Select Group" / "Deselect Group" per resource category on `/security/roles/:id`.
- [x] **Master Toggle**:
  - "Select All Permissions" / "Deselect All" switch.
- [x] **System Role Guard**:
  - `super_admin`'s permission matrix is read-only in the UI (clicking a toggle shows an info toast instead of changing anything).

---

## 4. Security Policies & Governance Settings (`/security/settings`)

Corporate-wide security guardrails enforced at the authentication gateway.

### 4.1 Password Complexity Enforcement
- [x] **Configurable Minimum Password Length**:
  - Interactive slider (Range: 6 to 24 characters, default: 8) on `/security/settings`.
  - Enforced server-side on every password-setting path (login-time `changePassword`, OTP reset, email-link reset, and invitation acceptance) via a shared `validatePasswordAgainstPolicy` check against the live policy — not hardcoded per-endpoint rules.
  - Frontend password forms (Login's forgot/reset flows, Change Password, Accept Invite) fetch the live policy (`GET /auth/password-policy`, public) so the strength meter and requirements checklist reflect the real configured rules, not a hardcoded default.
- [x] **Character Set Rules**:
  - Require at least one uppercase letter (`A-Z`).
  - Require at least one lowercase letter (`a-z`).
  - Require at least one number (`0-9`).
  - Require at least one special character (`!@#$%^&*`).
  - Same server-side + frontend enforcement as above; a disabled rule is hidden from the requirements checklist rather than shown as an unmet requirement.
- [ ] **Password Age & Expiration**:
  - Days before password expiration (Never, 30, 60, 90, 180 days).
  - Prevent password reuse (Disallow previous 3, 5, or 10 passwords).
  - Not implemented — no password history is retained today.

### 4.2 Session & Inactivity Management
- [x] **Inactivity Timeout** (partial):
  - `sessionTimeoutMinutes` now genuinely drives the JWT access token's lifetime (issued dynamically at login/invitation-accept instead of a hardcoded 15 minutes).
  - ⏳ Not implemented: this is a fixed-lifetime session, not true *inactivity* tracking — there is no `/auth/refresh` endpoint or activity-based sliding expiry, so once the token expires the user is simply signed out and must log in again (no warning modal beforehand).
- [ ] **Concurrent Session Limits**:
  - Allow single active device vs. multiple simultaneous devices per administrative account. Not implemented — no schema field or enforcement exists for this.

### 4.3 Brute-Force Protection & Account Lockout
- [x] **Failed Login Attempt Threshold**:
  - `maxFailedAttempts` now genuinely drives lockout in `AuthService.login()` (previously a hardcoded constant that ignored this setting entirely).
- [x] **Lockout Duration**:
  - `lockoutDurationMinutes` now genuinely drives the lockout window (previously hardcoded to 30 minutes regardless of configuration). "Permanent until HR Admin unlocks" is implemented as a long (24h) duration, not a true infinite lock.
- [x] **Lockout Notification**:
  - Automated warning email sent to the user when their account is locked due to suspicious activity.

### 4.4 Two-Factor Authentication (2FA / MFA) Roadmap
- [ ] **2FA Policy Mode**:
  - `OFF`: Optional for all users.
  - `OPTIONAL`: Users can self-enroll via Google Authenticator / Authy.
  - `ENFORCED_ADMINS`: Mandatory for Super Admin, HR Admin, and Managers.
  - `ENFORCED_ALL`: Mandatory across the organization.

---

## 5. Security Audit Trail & Access Logs (Section 5 Integration)

Transparent accountability for all administrative actions.

### 5.1 System Audit Logs (`/audit/logs`)
- [x] Capture immutable audit events for all User Management actions (writes to the existing `audit_logs` collection also used by the Employee/Organization modules):
  - `USER_INVITED`, `INVITATION_RESENT`, `INVITATION_REVOKED`, `INVITATION_ACCEPTED`
  - `ROLE_ASSIGNED`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`, `ACCOUNT_SUSPENDED` / `ACCOUNT_ACTIVATED`
  - `PASSWORD_RESET_DISPATCHED`, `SESSIONS_TERMINATED`, `SECURITY_POLICY_MODIFIED`
  - ⏳ Not implemented: the `/audit/logs` viewer page/endpoint itself, and CSV export — tracked under Phase 4. The data these events need is now being captured.

### 5.2 Login & Authentication History (`/audit/login-history`)
- [x] Real-time log of all login attempts, gated behind `audit:login_history`:
  - Timestamp, work email, outcome, and failure reason (unknown account, wrong password, account locked, account inactive).
  - IP address, user agent, derived device type and browser.
  - Suspicious-pattern banner: IPs with repeated failures in the last 24h, showing failure count and how many distinct accounts were targeted; click-through filters the table to that IP.
  - ⏳ Not implemented: geolocation (city/country) — needs a GeoIP dependency; and MFA failure states, since 2FA doesn't exist yet (§4.4).

---

## 6. Implementation Phases for Release 1

| Phase | Deliverable | Key Screens & API Endpoints | Target Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Backend Core & Roster** | `Role` schema, `SecurityPolicy` schema, Users Roster (`/security/users`), Status toggle, Roles CRUD, Password rules, RBAC guard on all `/users` endpoints, top metric counters, admin-triggered session termination. | ✅ Completed |
| **Phase 2** | **Invite User Engine** | Invite User Modal, Token generation, Nodemailer email invite dispatch, `/auth/accept-invite` page, Pending Invites tab (resend/revoke), audit logging for all invitation & user-management events. | ✅ Completed |
| **Phase 3** | **Department Scope for Managers** | `user.departmentScope` + `EmployeeScopeService`; enforced on employee list, detail, CSV export, update, status change, delete, and onboarding resend. Scope auto-expands to descendant departments; an explicit `?departmentId=` outside scope cannot widen it. Falls back to the manager's own linked-employee department when no explicit scope is set. Super Admin / HR Admin remain org-wide. | ✅ Completed |
| **Phase 4** | **Audit Trail & Login History** | Centralized `AuditService` (all modules), canonical action/resource vocabulary, sanitized changed-fields-only diffs, request-id correlation, append-only read API, audit viewer (`/audit/logs`) with side-by-side diff drawer, employee audit timeline, login activity inspector (`/audit/login-history`) with suspicious-IP detection, CSV export that audits itself. | ✅ Completed |
