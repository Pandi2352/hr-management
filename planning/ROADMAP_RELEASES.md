# PeopleOS — Release Roadmap & Progression Matrix

This document defines the 20-release evolution of **PeopleOS**, establishing clear milestone boundaries, functional priorities, and technical prerequisites.

---

## 1. Executive Roadmap Summary

| Release | Codename | Focus Area | Priority | Target Architecture Phase |
| :--- | :--- | :--- | :--- | :--- |
| **Release 1** | **Foundation** | Auth, Identity, Org Structure, Employees, RBAC, Core Audit | **P0 (MVP)** | Stage 1: Modular Monolith |
| **Release 2** | **Employee Operations** | Lifecycle, Onboarding Checklists, Probation, Approvals, Policies | **P0 (MVP)** | Stage 1: Modular Monolith |
| **Release 3** | **Time & Leave** | Attendance, Shifts, Overtime, Regularization, Leave Engine | **P0 (MVP)** | Stage 2: Monolith + Redis Cache |
| **Release 4** | **Performance** | Goals, OKRs, Performance Cycles, 360 Reviews, PIP | **P1** | Stage 2: Monolith + Redis |
| **Release 5** | **Recruitment / ATS** | Job Requisitions, Candidate Pipeline, Interview Scheduling, Offers | **P1** | Stage 2: Monolith + Async Jobs |
| **Release 6** | **Talent & Learning** | Skill Matrix, Competency Frameworks, LMS, Courses, Certifications | **P1** | Stage 2: Monolith + Async Jobs |
| **Release 7** | **Workforce Intelligence** | Capacity Planning, Headcount Forecasting, Utilization, Org Insights | **P1** | Stage 2: Monolith + Workers |
| **Release 8** | **Compensation** | Salary Structures, Pay Bands, Increments, Bonuses, Pay Equity | **P1** | Stage 2: Monolith + Workers |
| **Release 9** | **Employee Expenses** | Expense Claims, Categories, Approvals, Multi-currency Reimbursement | **P2** | Stage 2: Monolith + Workers |
| **Release 10** | **Engagement** | Pulse Surveys, eNPS, Recognition, Badges, Sentiment Analysis | **P2** | Stage 2: Monolith + Workers |
| **Release 11** | **HR Case Management** | Helpdesk, Ticketing, SLA Tracking, Escalations, Knowledge Base | **P2** | Stage 2: Monolith + Workers |
| **Release 12** | **Workflow Automation** | Visual Workflow Builder, Trigger-Condition-Action, Rule Engine | **P1** | Stage 3: Event-Driven Architecture |
| **Release 13** | **Communication** | In-App Comms, Announcements, Direct Messages, WebSockets | **P2** | Stage 3: Real-Time WebSockets |
| **Release 14** | **Analytics & Reporting** | Custom Report Builder, Executive Dashboards, Data Exports | **P1** | Stage 3: Read-Replicas & Aggregators |
| **Release 15** | **Documents & Compliance** | Document Templates, Digital Signatures, Expiry, Statutory Reports | **P1** | Stage 3: Async Document Workers |
| **Release 16** | **AI Intelligence** | HR Copilot, Resume Matcher, Attrition Predictor, Natural Language BI | **P2** | Stage 3: Dedicated AI Worker / LLM |
| **Release 17** | **Enterprise Security** | SSO (SAML/OIDC), MFA, IP Whitelisting, Advanced RBAC Policies | **P1** | Stage 3: Enterprise Auth Layer |
| **Release 18** | **Multi-Tenant SaaS** | Tenant Isolation, Subscription Tiers, Feature Flags, Quotas | **P1** | Stage 4: Multi-Tenant Partitioning |
| **Release 19** | **Integrations** | Google Workspace, Microsoft 365, Slack, Payroll/ERP Webhooks | **P2** | Stage 4: Integration Engine |
| **Release 20** | **Platform Engineering** | Kubernetes, Distributed Tracing, DLQ, Outbox Pattern, Observability | **P1** | Stage 4: Distributed Cloud Native |

---

## 2. MVP Boundary: Releases 1 through 3

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MVP BOUNDARY (P0)                               │
│                                                                        │
│   RELEASE 1: FOUNDATION                                                │
│   • Secure Auth & User Provisioning                                    │
│   • Multi-level Org Hierarchy (Departments, Designations, Locations)   │
│   • Complete Employee Profile & Document Vault                         │
│   • Granular RBAC & Immutable Audit Logs                               │
│                            │                                           │
│                            ▼                                           │
│   RELEASE 2: EMPLOYEE OPERATIONS                                       │
│   • State-driven Employee Lifecycle (Hire to Exit)                     │
│   • Digital Onboarding Checklists (HR, IT, Manager, Self-service)      │
│   • 30/60/90 Day Probation Reviews & Confirmations                     │
│   • Centralized Multi-level Approval Engine                            │
│   • Company Holiday Calendars & Policy Acknowledgments                 │
│                            │                                           │
│                            ▼                                           │
│   RELEASE 3: ATTENDANCE & LEAVE                                        │
│   • Web/Mobile Check-In & Check-Out with Work Hour Compute             │
│   • Shift Scheduling & Rotations (Grace Periods, Late/Early Rules)     │
│   • Attendance Regularization Dispute Workflow                         │
│   • Custom Leave Types, Balances, Accrual & Multi-tier Approvals       │
└────────────────────────────────────────────────────────────────────────┘
```

> **Why R1–R3 is the Golden MVP:**
> An organization cannot run performance appraisals or complex AI workflows without having clean employee records (R1), formal lifecycle contracts (R2), and active daily attendance/leave tracking (R3). Releasing R1–R3 delivers immediate operational value to real companies.

---

## 3. Detailed Release Specifications

### Phase 1: MVP Core (P0)

#### Release 1 — MVP Foundation
- **Goal**: Establish the platform backbone, security layer, organization hierarchy, and core employee database.
- **Key Modules**: Authentication, User Management, Organization Hierarchy, Employee Management, Roles & Permissions (RBAC), Audit Trails, Employee & HR Dashboards.
- **Exit Criteria**:
  - Super admin can provision organization units and roles.
  - HR can create, update, search, filter, and view employee profiles.
  - JWT tokens and role guards block unauthorized access.
  - All sensitive actions write to the audit log.

#### Release 2 — Employee Operations
- **Goal**: Enable seamless lifecycle transitions from pre-boarding through exit, with standardized approvals.
- **Key Modules**: Employee Lifecycle Transitions, Digital Onboarding, Probation Management, Employee Requests, Approval Workflow Engine (v1), Company Policies, Holiday Calendars.
- **Exit Criteria**:
  - Employee status transitions adhere to strict state machine rules.
  - Onboarding checklists assign tasks to IT, HR, and candidate.
  - Automated probation alerts allow manager recommendation and HR confirmation.
  - Multi-tier approval chain functions end-to-end.

#### Release 3 — Attendance & Leave
- **Goal**: Automate time tracking, shift scheduling, and leave management.
- **Key Modules**: Time Clock (Check-in/out), Daily/Monthly Attendance, Shifts & Rostering, Overtime & Regularization, Leave Types & Policies, Leave Balances & Accruals, Leave Calendars.
- **Exit Criteria**:
  - Accurate work hour calculations accounting for breaks, late arrivals, and early exits.
  - Employees can request regularization for missed punches.
  - Leave balance calculation automatically increments accruals and deducts approved leaves.
  - Team calendar prevents conflicting leave schedules.

---

### Phase 2: Talent & Workforce Operations (P1 / P2)

#### Release 4 — Performance Management (P1)
- **Features**: Performance cycles (Annual, Quarterly), OKRs, KPI cascading, Self-reviews, Manager reviews, 360-degree feedback, Competency ratings, Performance Improvement Plans (PIP).
- **Prerequisite**: R1 (Employees, Roles), R2 (Reporting Managers).

#### Release 5 — Recruitment / ATS (P1)
- **Features**: Requisition workflows, Job postings, Candidate resume database, Pipeline stages (Applied $\to$ Screened $\to$ Interviewed $\to$ Offered), Interview panel scheduling, Scorecards, Offer letter generation.
- **Prerequisite**: R1 (Org, Designations), R2 (Onboarding handoff).

#### Release 6 — Talent & Learning (P1)
- **Features**: Skill matrices, Competency gap analysis, Career progression pathways, Succession planning grids (9-box), Course catalog, Training assignments, Certification tracking.
- **Prerequisite**: R1 (Skills, Employees), R4 (Performance ratings).

#### Release 7 — Workforce Intelligence (P1)
- **Features**: Capacity planning, Headcount budgeting vs. actuals, Department utilization, Skill gap mapping, Attrition trend modeling, Executive workforce dashboard.
- **Prerequisite**: R1, R3, R4, R5, R6 data pipelines.

#### Release 8 — Compensation (P1)
- **Features**: Salary structures (Basic, HRA, Allowances, Deductions), Pay bands, Increment cycles, Variable pay/bonuses, Compensation review workflows, Pay equity analytics.
- **Prerequisite**: R1 (Employee contracts), R4 (Appraisal ratings).

#### Release 9 — Employee Expenses (P2)
- **Features**: Expense categories, Policy limits (per diem, mileage), Receipt uploads, Multi-currency conversion, Manager & Finance approval workflows, Payment settlement tracking.
- **Prerequisite**: R1 (Org, Cost Centers), R2 (Approvals).

#### Release 10 — Employee Engagement (P2)
- **Features**: Anonymous pulse surveys, eNPS scores, Peer recognition (kudos/badges), Reward point catalogs, Sentiment trend analysis.
- **Prerequisite**: R1 (Employee directory).

#### Release 11 — HR Case Management (P2)
- **Features**: Internal HR ticketing, Category routing (Payroll, Benefits, Grievances), SLA tracking, First-response timers, Internal notes, Ticket resolution feedback.
- **Prerequisite**: R1 (Employees, Roles), R2 (Approvals).

---

### Phase 3: Automation & Enterprise Scale (P1 / P2)

#### Release 12 — Workflow Automation Engine (P1)
- **Features**: Visual trigger-condition-action workflow builder, Webhook triggers, Scheduled recurring automations, Multi-branch approval nodes, SLA escalation timeouts.
- **Prerequisite**: R1 through R11 domain event integration.

#### Release 13 — Communication & Collaboration (P2)
- **Features**: Company-wide and department announcements, Pinning, Read receipts, Direct & group channels, Threaded comments, WebSocket real-time delivery.
- **Prerequisite**: R1 (Directory), Redis Pub/Sub.

#### Release 14 — Analytics & Reporting (P1)
- **Features**: Drag-and-drop report builder, Standard statutory reports, Scheduled email dispatches, Role-based data exports (CSV, XLSX, PDF), Query optimizations via read-replicas.
- **Prerequisite**: Read-replicas, Aggregated view schemas.

#### Release 15 — Documents & Compliance (P1)
- **Features**: Dynamic document templates (Mustache/Handlebars), PDF generation engine, E-signatures, Document expiry tracking, Compliance archive retention policies.
- **Prerequisite**: S3/MinIO Object Storage, Background worker queues.

#### Release 16 — AI Intelligence (P2)
- **Features**: Natural Language HR Assistant, AI resume parser & candidate ranker, Automated interview transcript summarizer, Attrition risk predictive models, Skill gap recommendations.
- **Prerequisite**: Python/FastAPI AI worker service or NestJS LangChain bridge, R1–R7 historical datasets.

#### Release 17 — Enterprise Security (P1)
- **Features**: SAML 2.0 / OpenID Connect (OIDC) SSO, TOTP Multi-Factor Authentication, Session concurrent limits, IP whitelisting per organization, Advanced security audits.
- **Prerequisite**: Enterprise customer tier requirements.

#### Release 18 — Multi-Tenant SaaS (P1)
- **Features**: Tenant schema or row-level tenant isolation, Custom domains/subdomains, Plan quotas (max seats, storage limits), Stripe/Paddle subscription billing webhooks.
- **Prerequisite**: Tenant context middleware, DB migration utilities.

#### Release 19 — Integrations Ecosystem (P2)
- **Features**: Google Workspace & MS 365 directory sync, Slack & Teams bot notifications, External Payroll (ADP, Gusto) export formats, Public developer REST API & API keys.
- **Prerequisite**: Outbox pattern, Rate-limited public gateway.

#### Release 20 — Advanced Platform Engineering (P1)
- **Features**: Kubernetes deployment manifests, Helm charts, OpenTelemetry tracing, Prometheus metrics, Centralized logging (ELK/Loki), Outbox pattern, Distributed locking with Redlock.
- **Prerequisite**: All core modules operational.
