# PeopleOS — Release 1: Master Overview & Execution Index

```
                         PEOPLEOS — RELEASE 1 (FOUNDATION)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
  [IDENTITY & ACCESS]           [ORGANIZATION HIERARCHY]         [EMPLOYEE MASTER]
  • JWT Auth (15m/7d)           • Org Profile & Settings         • Directory & Search
  • Brute Force Lockout         • Departments (Tree View)        • Multi-tab Profile
  • Password Policies           • Designations (Grades 1-10)     • Sub-docs & Vault
  • Fine-grained RBAC           • Locations & Cost Centers       • Audit Log Diffs
```

Welcome to the **Release 1 (Foundation)** planning and documentation center. Release 1 provides the foundational architecture upon which all subsequent PeopleOS modules are constructed.

---

## 📚 Release 1 Documentation Suite

| Document | Purpose | Key Content |
| :--- | :--- | :--- |
| 📄 **[PRD_RELEASE1.md](file:///d:/001-hr-management/releases/release1/PRD_RELEASE1.md)** | Product Requirements Document | Release vision, 6 core modules, functional specs, security rules, and acceptance criteria. |
| 🖥️ **[UI_PAGES_RELEASE1.md](file:///d:/001-hr-management/releases/release1/UI_PAGES_RELEASE1.md)** | Frontend UI Inventory | Complete catalog of all 20+ UI pages, views, modals, and drawers required for Release 1. |
| ⏱️ **[SPRINT_PLAN_RELEASE1.md](file:///d:/001-hr-management/releases/release1/SPRINT_PLAN_RELEASE1.md)** | Sprint & Execution Plan | 4 sprints across 8 weeks with user stories, deliverables, and acceptance gates. |
| 🗺️ **[EMPLOYEE_MODULE_ROADMAP.md](file:///d:/001-hr-management/releases/release1/EMPLOYEE_MODULE_ROADMAP.md)** | Employee Module Roadmap | Detailed roadmap, implemented features, and upcoming capabilities (Document Vault, Bulk Import, Org Chart, etc.). |
| 🛡️ **[USER_MANAGEMENT_ROADMAP.md](file:///d:/001-hr-management/releases/release1/USER_MANAGEMENT_ROADMAP.md)** | User Management & Security Roadmap | Full feature checklist for administrative user invitations (Managers, HR, Admins), token flows, RBAC matrix, and security policies. |

---

## 🎯 Release 1 Scope Summary

### 1. What is IN Release 1:
- ✅ Secure Authentication (Email/Password, JWT Access/Refresh tokens, bcrypt 12 rounds, lockout rules).
- ✅ User Management & Account States (`INVITED`, `ACTIVE`, `SUSPENDED`, `INACTIVE`, `LOCKED`).
- ✅ Organization Profile, Multi-level Department Trees, Designations ($1$–$10$ Grade levels), Locations, and Cost Centers.
- ✅ Employee Directory (Table & Grid views, fuzzy search, multi-field filters).
- ✅ Employee Master Profile (Personal, Employment, Contacts, Emergency, Academics, Skills, Document Vault).
- ✅ Role-Based Access Control (RBAC) with dynamic permission matrix.
- ✅ Non-blocking immutable Audit Logging with before/after diff tracking.
- ✅ Dashboards: HR Admin Overview & Employee Self-Service Dashboard.

### 2. What is DEFERRED to Subsequent Releases:
- ⏳ *Lifecycle transitions, onboarding checklists, probation reviews, approval workflows* $\to$ **Release 2**
- ⏳ *Attendance punch clocks, shift scheduling, leave balance engine* $\to$ **Release 3**
- ⏳ *Performance appraisals, OKRs, 360 feedback* $\to$ **Release 4**
- ⏳ *Recruitment & Applicant Tracking System (ATS)* $\to$ **Release 5**
