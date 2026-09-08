# PeopleOS — Enterprise HR & Workforce Operating System

```
                         PEOPLEOS PLATFORM
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
   HR OPERATIONS                                   MANAGEMENT
   • Organization Structure                        • Executive Dashboards
   • Employee Master Profiles                      • Headcount Analytics
   • Lifecycle (Onboarding - Exit)                 • Workforce Forecasting
   • Attendance & Shifts                           • Performance & 360 Reviews
   • Leave & Accrual Engine                        • Compensation & Bands
        │                                               │
        └───────────────────────┬───────────────────────┘
                                │
                          INTELLIGENCE
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
   AI COPILOT                                      AUTOMATION
   • Natural Language Queries                      • Visual Workflow Engine
   • Resume & Candidate Matching                   • Multi-tier Approvals
   • Flight Risk / Attrition AI                    • Automated Notifications
```

PeopleOS is an enterprise-grade Human Resources and Workforce Management platform engineered to transition organizations from disjointed spreadsheets and fragmented SaaS point solutions into a unified, high-performance **Workforce Operating System**.

---

## 📚 Documentation Index

All architectural guidelines, functional requirements, and release roadmaps are maintained in the `docs/` and `planning/` directories:

### Planning & Product Strategy (`planning/`)
- 🗺️ **[Release Roadmap & Progression Matrix](file:///d:/001-hr-management/planning/ROADMAP_RELEASES.md)**: 20-release progression plan, highlighting MVP boundaries (Releases 1–3), P0/P1/P2 priorities, and architectural milestones.
- 📦 **[30-Module Complete Catalog](file:///d:/001-hr-management/planning/MODULE_CATALOG.md)**: Comprehensive business breakdown of all 30 modules, mapped directly to releases, target entities, and user personas.
- 🎯 **[MVP Specification (Releases 1–3)](file:///d:/001-hr-management/planning/MVP_SPECIFICATION.md)**: Deep dive into Foundation (R1), Employee Operations (R2), and Attendance & Leave (R3) with state machines and test suites.
- 🚀 **[Release 1: Foundation Planning Suite](file:///d:/001-hr-management/releases/release1/README.md)**: Dedicated PRD, full UI pages list, and 4-sprint execution plan for Release 1.
- 🔄 **[Release 2: Employee Operations Planning Suite](file:///d:/001-hr-management/releases/release2/README.md)**: Dedicated PRD, full UI pages list, and 4-sprint execution plan for Release 2.
- ⏱️ **[Release 3: Time & Leave Planning Suite](file:///d:/001-hr-management/releases/release3/README.md)**: Dedicated PRD, full UI pages list, and 4-sprint execution plan for Release 3 (Final MVP Phase).
- ✅ **[Definition of Done (DoD)](file:///d:/001-hr-management/planning/DEFINITION_OF_DONE.md)**: Quality checklists across UI, API, database migrations, testing, security, and CI/CD gating.

### Technical Architecture & Standards (`docs/`)
- 📄 **[Product Requirements Document (PRD)](file:///d:/001-hr-management/docs/PRD_PEOPLEOS.md)**: Official PRD outlining vision, target personas, core use cases, NFRs, and scope boundaries.
- 🏛️ **[Technology Stack & Architecture](file:///d:/001-hr-management/docs/TECH_STACK_ARCHITECTURE.md)**: System design across 4 evolutionary stages, covering React 19, NestJS, PostgreSQL 16, Redis 7, BullMQ, and Kubernetes.
- 🗄️ **[Core Database Schema & ERD](file:///d:/001-hr-management/docs/DATABASE_SCHEMA_CORE.md)**: Entity-Relationship definitions, Mongoose schemas, sub-documents, and compound indexing strategies for MVP domains.
- 🔌 **[API Design Guidelines](file:///d:/001-hr-management/docs/API_DESIGN_GUIDELINES.md)**: REST conventions, standard response envelopes (`ApiResponse<T>`), HTTP status mappings, validation DTOs, and RBAC guards.
- 🖥️ **[UI Inventory: Pages, Components & Utils](file:///d:/001-hr-management/docs/UI_INVENTORY.md)**: Master inventory listing all UI pages, reusable layout/form/data components, utility functions, and custom React hooks.
- 🎨 **[Frontend Setup & Architecture](file:///d:/001-hr-management/docs/FRONTEND_SETUP.md)**: React 19 + Vite + Tailwind CSS v4 setup steps, project tree, and theme utilities.
- ⚙️ **[Backend Setup & Architecture](file:///d:/001-hr-management/docs/BACKEND_SETUP.md)**: NestJS 10 + MongoDB/Mongoose setup steps, modular monolith folder structure, and real-time WebSockets.

---

## 🚀 MVP Scope & Release Roadmap

The MVP is engineered to deliver immediate operational utility to companies across three initial phases:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│       RELEASE 1         │       RELEASE 2         │       RELEASE 3         │
│   Foundation (DONE ✅)  │   Employee Operations   │   Attendance & Leave    │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • Authentication (JWT)  │ • Lifecycle Transitions │ • Web Check-In / Out    │
│ • User Account States   │ • Digital Onboarding    │ • Shift Scheduling      │
│ • Department Hierarchy  │ • Probation Reviews     │ • Regularization Flow   │
│ • Employee Directory    │ • Multi-tier Approvals  │ • Leave Balance Engine  │
│ • Granular RBAC         │ • Company Policies      │ • Leave Applications    │
│ • Immutable Audit Logs  │ • Holiday Calendars     │ • Team Leave Heatmap    │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## ✅ Release 1: Foundation — Completed Features

### 1. Authentication & Security
- Work email & password authentication with JWT access tokens (15m) & HTTP-only refresh cookies (7d)
- Transparent Axios token refresh interceptor with automatic token rotation
- Brute-force protection with automatic 30-minute account lockout after 5 consecutive failed attempts
- Configurable password complexity policies (length, uppercase, lowercase, numbers, symbols)
- Password reset flow with cryptographic tokens & expiry validation
- Remote session revocation & multi-device session termination
- Invitation acceptance & first-time password setup (`/auth/accept-invite`)

### 2. Organization Management
- Organization profile (legal name, tax ID, registration, timezone, currency, branding logo)
- Multi-tier department management (CRUD, department head assignment, active status toggles)
- Interactive hierarchical department tree visualization (`/organization/departments/tree`)
- Standardized designations catalog with grade/seniority levels (1 to 10)
- Branch office locations & physical facilities directory
- Cost centers repository linked to departmental budgeting

### 3. Employee Master Directory
- Dual-mode employee directory (Grid Cards & High-Density Data Table)
- Real-time fuzzy search by name, email, employee code, and department
- Multi-attribute filters (Department, Designation, Employment Type, Status)
- Cryptographic server-side employee ID generator (`EMP-XXXXX`)
- Multi-step employee creation wizard with inline field validation
- Tabbed employee profile (Personal, Employment, Contacts, Academics, Skills, Documents, Audit)
- Document Vault (multi-format upload, PDF/image preview, HR verification status, secure download)
- Employee lifecycle status transitions (`ACTIVE`, `PROBATION`, `ON_LEAVE`, `SUSPENDED`, `RESIGNED`, `TERMINATED`)
- Safe soft delete with automatic credential access revocation

### 4. User Management & Administrative Invitations
- Administrative user accounts roster (`/security/users`)
- Cryptographically signed single-use invitation token engine (32-byte tokens, bcrypt-hashed at rest)
- Automated branded invitation email dispatch via Nodemailer
- Invitation lifecycle controls (pending tab, resend triggers with rate limits, revocation)
- Public invitation acceptance form with live password policy meter
- User account lifecycle states (`INVITED`, `ACTIVE`, `SUSPENDED`, `INACTIVE`, `LOCKED`)
- Remote session termination & administrative account unlock

### 5. Roles & Access Governance (RBAC)
- System roles (`SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`) & custom roles
- Granular permission matrix (`<resource>:<action>`) across Employees, Organization, Users, and Audit
- Dynamic RBAC enforcement guards (`JwtAuthGuard`, `@Permissions()`, `@Roles()`)
- Role assignment and permission inspection interface (`/security/roles`)

### 6. Audit & Compliance
- Non-blocking immutable audit logging on all administrative state mutations
- Field-level change tracking capturing before and after diffs (`old_value` vs `new_value`)
- Forensic audit log viewer (`/audit/logs`) with side-by-side JSON diff inspection drawer
- Authentication login history log (`/audit/login-history`) tracking IP, user-agent, and status
- Suspicious activity detection for brute-force attempts and account lockouts

### 7. Dashboards & Public Portal
- HR Admin Dashboard (headcount metrics, department distribution, activity feed)
- Employee Self-Service Dashboard (profile completion meter, personal quick links)
- Public Careers Portal (`/careers`) with job listings and direct application modal
- Public Contact Us page (`/contact`) with interactive inquiry submission

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | **React 19 + TypeScript (Vite)**, Tailwind CSS, Radix UI / Headless UI, TanStack React Query v5, React Hook Form, Zod, Lucide Icons |
| **Backend API** | **NestJS + TypeScript** (Modular Monolith), `@nestjs/mongoose`, Mongoose, class-validator, Passport JWT, Swagger / OpenAPI |
| **Primary Database** | **MongoDB 7.0+** (Replica Set for multi-document ACID transactions, compound & partial indexes, Mongoose schemas) |
| **Mobile App** | **React Native (Expo SDK)**, TypeScript, NativeWind (Tailwind), React Query, Biometrics, Geofencing |
| **Cache & Queues** | **Redis 7** (Session tokens, caching, distributed locks), **BullMQ** (Asynchronous background worker queues) |
| **DevOps & Tooling** | Docker, Docker Compose (MongoDB Replica Set + Redis), GitHub Actions CI/CD |

---

## 📂 Repository Layout

```
001-hr-management/
├── backend/            # NestJS Modular Monolith API application
├── frontend/           # React 19 + Vite + Tailwind CSS Web Application
├── mobile-app/         # React Native (Expo) Mobile Application
├── docs/               # Technical specs, PRD, DB schema, and API standards
│   ├── PRD_PEOPLEOS.md
│   ├── TECH_STACK_ARCHITECTURE.md
│   ├── DATABASE_SCHEMA_CORE.md
│   └── API_DESIGN_GUIDELINES.md
├── planning/           # Engineering roadmaps, release matrices, and specs
│   ├── ROADMAP_RELEASES.md
│   ├── MODULE_CATALOG.md
│   ├── MVP_SPECIFICATION.md
│   └── DEFINITION_OF_DONE.md
└── README.md           # Master documentation index
```
