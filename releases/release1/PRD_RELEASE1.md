# PeopleOS — Release 1: Foundation (PRD)

| Document Version | Phase | Target Audience | Status |
| :--- | :--- | :--- | :--- |
| **1.0.0** | **Release 1 (MVP Foundation)** | Engineering, Product, HR Ops, Security, QA | **Approved** |

---

## 1. Executive Summary & Release Goals

**Release 1 (Foundation)** delivers the operational backbone of the **PeopleOS** platform. It provides enterprise-ready multi-tenant identity, hierarchical organization modeling, granular Role-Based Access Control (RBAC), employee profile management with document vaulting, and non-blocking immutable audit logging.

### 1.1 Strategic Objectives
- **Single Master Directory**: Eliminate fragmented spreadsheets by establishing a single source of truth for all employee and organizational master records.
- **Strict Role-Based Security**: Implement zero-trust RBAC governing resources and actions (`User`, `Organization`, `Department`, `Designation`, `Employee`, `AuditLog`).
- **Complete Profile & Document Vault**: Digitize employee personal, employment, academic, skill, and legal identity documents.
- **Auditability**: Track every administrative change with field-level diffs (`old_value` vs `new_value`).

---

## 2. Release 1 Modules & Functional Scope

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RELEASE 1: FOUNDATION MODULES                         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Authentication & Security         │ 2. Organization Structure            │
│ • Secure Email/Password Login (JWT)  │ • Organization Profile & Settings    │
│ • Refresh Token Rotation & Sessions  │ • Multi-tier Departments (Tree View) │
│ • Password Policies & Lockout rules  │ • Designations & Grade Levels        │
│ • Forgot / Reset Password flow       │ • Locations, Branches & Cost Centers │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. Employee Master Record            │ 4. Roles, Permissions & Governance   │
│ • Directory with Search & Filtering  │ • Custom & System Roles              │
│ • Multi-tabbed Profile Views         │ • Fine-grained Permission Matrix     │
│ • Sub-documents (Contacts, Skills)   │ • User Account Provisioning          │
│ • Secure Document Storage & Verify   │ • Immutable Audit Logs & Access Trail│
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. Core Functional Requirements

### 3.1 Module 01: Authentication & Identity
- **Login Flow**: Authenticate via work email and password. Issue 15-minute JWT access token and 7-day HTTP-only refresh token stored in `sessions` collection.
- **Brute Force Protection**: Account locked automatically for 30 minutes after 5 consecutive failed attempts.
- **Password Policies**: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
- **Session Revocation**: Admin or user can revoke all active sessions remotely.

### 3.2 Module 02: User Management
- **User States**: `INVITED` $\to$ `ACTIVE` $\to$ `SUSPENDED` $\to$ `INACTIVE` $\to$ `LOCKED`.
- **Invitation Flow**: Admin invites user via email; user accepts invite, sets password, and activates account.
- **Role Assignment**: Assign one or more roles to a user account.

### 3.3 Module 03: Organization Hierarchy
- **Organization Profile**: Legal name, registration code, corporate domain, standard timezone, base currency.
- **Departments**: Recursive parent-child tree hierarchy, designated Department Head, assigned cost center code.
- **Designations**: Standardized titles with hierarchical seniority levels ($1$ for Junior to $10$ for CXO).
- **Locations**: Physical company facilities, branches, and geographic timezones.

### 3.4 Module 04: Employee Management
- **Employee Directory**: Paginated, filterable grid/table with instant fuzzy search by name, email, employee code, department, and status.
- **Profile Sub-Modules**:
  - *Personal*: Name, DOB, gender, blood group, marital status.
  - *Employment*: Employee code, date of joining, department, designation, reporting manager, employment type (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`).
  - *Contacts*: Current address, permanent address, emergency contacts (name, relationship, phone).
  - *Academics & Experience*: Degrees, institutions, prior employers, past roles.
  - *Skills*: Skill name and proficiency rating (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`).
  - *Document Vault*: Encrypted uploads for resumes, government IDs, education degrees, and employment agreements with verification status.

### 3.5 Module 05: Roles, Permissions & RBAC
- **Permission Format**: `<resource>:<action>` (e.g., `employee:create`, `employee:read`, `employee:update`, `employee:delete`, `department:manage`, `audit:read`).
- **Default Roles**:
  - `SUPER_ADMIN`: Unrestricted platform governance.
  - `HR_ADMIN`: Full access to Organization, Employees, and User management.
  - `MANAGER`: Read access to direct report profiles; department directory viewing.
  - `EMPLOYEE`: Read own profile; view company public directory.

### 3.6 Module 06: Audit Logs & Compliance
- Automatic audit log creation on every non-GET request.
- Log attributes: `actor_user_id`, `client_ip`, `user_agent`, `action`, `resource`, `resource_id`, `old_value`, `new_value`, `created_at`.
- Immutable append-only collection (`audit_logs`).

---

## 4. Non-Functional Requirements (NFR)

- **Response Latency**: P95 $< 150\text{ ms}$ for directory queries; $< 250\text{ ms}$ for profile writes with audit trails.
- **Database**: MongoDB 7.0+ Replica Set supporting multi-document transactions.
- **Security**: AES-256 encrypted fields for sensitive PII; bcrypt password hashing ($12$ rounds); OWASP Top 10 compliance.
- **Client Compatibility**: Chrome, Firefox, Safari, Edge; fully responsive on mobile viewports ($\ge 375\text{px}$).

---

## 5. Acceptance Criteria

1. Admin can successfully invite a user, and user can complete setup and login.
2. An employee profile can be created with all personal, contact, and employment details without data loss.
3. Users with `EMPLOYEE` role cannot edit their department, salary, or designation, and receive HTTP 403 Forbidden.
4. Updates to employee designations or departments immediately generate an audit log entry with before/after diffs.
5. All UI pages handle loading skeletons, empty states, and validation errors gracefully.
