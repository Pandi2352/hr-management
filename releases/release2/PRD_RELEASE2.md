# PeopleOS — Release 2: Employee Operations (PRD)

| Document Version | Phase | Target Audience | Status |
| :--- | :--- | :--- | :--- |
| **1.0.0** | **Release 2 (Employee Operations)** | Engineering, Product, HR Ops, People Managers, QA | **Approved** |

---

## 1. Executive Summary & Vision

Building directly upon the foundational master directory established in **Release 1**, **Release 2 (Employee Operations)** digitizes and automates the core functional events of an employee's journey inside the company: **Onboarding, Probation, Lifecycle Transitions (Promotions/Transfers), Generic Employee Requests, Centralized Multi-Level Approvals, Company Policies, and Exit Management**.

> **"Transform manual paper-heavy HR transitions into automated, auditable, digital workflows."**

---

## 2. Release 2 Modules & Functional Scope

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RELEASE 2: EMPLOYEE OPERATIONS SCOPE                     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Employee Lifecycle Engine         │ 2. Digital Onboarding Checklists     │
│ • State Machine (Hire to Exit)       │ • HR, IT, Manager & Self Tasks       │
│ • Status Transitions & Gating        │ • Document Collection Milestones     │
│ • Historical Audit Timeline          │ • Auto Provisioning Triggers         │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. Probation Management              │ 4. Generic Approval Engine (v1)      │
│ • 30/60/90 Day Auto Milestones       │ • Polymorphic Approval Requests      │
│ • Manager Feedback & Rating          │ • Multi-tier Approval Chains         │
│ • Confirmation, Extension, Exit      │ • Delegation & Escalation Timeouts   │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 5. Employee Requests & Grievances    │ 6. Policies, Holidays & Offboarding  │
│ • Profile Change / Address Requests  │ • Location-based Holiday Calendars   │
│ • Employment Letters & Bonafides     │ • Policy Acknowledgments             │
│ • Bank Detail Change Requests        │ • Resignation, Clearances & Exits    │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. Core Functional Requirements

### 3.1 Module 01: Employee Lifecycle State Machine
- **State Progression**:
  `PRE_JOINING` $\longrightarrow$ `JOINING` $\longrightarrow$ `PROBATION` $\longrightarrow$ `CONFIRMED` $\longrightarrow$ `ON_LEAVE` $\longrightarrow$ `NOTICE_PERIOD` $\longrightarrow$ `EXITED` / `TERMINATED`.
- **Promotion & Transfer Operations**:
  - Department transfer with manager handoff.
  - Designation/level upgrade with compensation revision flags.
  - Role transition audit history stored in `employee_lifecycles`.

### 3.2 Module 02: Digital Onboarding Checklists
- **Configurable Task Templates**:
  - `HR Tasks`: Contract verification, identity document sign-off, statutory ID filing.
  - `IT Tasks`: Laptop provisioning, Google/MS account provisioning, VPN and tool access.
  - `Manager Tasks`: 30-day goals definition, mentor assignment, welcome 1:1.
  - `Employee Tasks`: Personal details submission, bank account details, signed policy acknowledgment.
- **Milestone Gating**: Employee cannot transition from `JOINING` to `PROBATION` until all mandatory document verification tasks are marked complete.

### 3.3 Module 03: Probation Management
- **Automated Milestone Alerts**: Triggered to the Reporting Manager at **Day 30**, **Day 60**, and **Day 75** (for standard 90-day probation).
- **Evaluation Form**: Rating across competencies (Job Knowledge, Quality of Work, Teamwork, Dependability).
- **Manager Recommendation**:
  1. `CONFIRM`: Direct transition to `CONFIRMED` upon HR sign-off.
  2. `EXTEND`: Extend probation by 30 to 90 days with mandatory justification.
  3. `TERMINATE`: Trigger separation workflow.

### 3.4 Module 04: Generic Multi-Tier Approval Engine (v1)
- **Polymorphic Requests**: A single unified framework handling:
  - Profile Change Requests, Document Requests, Attendance Regularizations, Leave Requests, and Resignations.
- **Hierarchical Chain Resolution**:
  ```
  Step 1: Immediate Reporting Manager
  Step 2: Department Head (if required by policy)
  Step 3: HR Administrator (final sign-off)
  ```
- **Features**: In-app push & email notifications, inline comments, temporary delegation (out-of-office delegation), and rejection reasoning.

### 3.5 Module 05: Company Policies & Holiday Calendars
- **Policy Repository**: Upload PDF documents with mandatory employee digital acknowledgment tracking.
- **Holiday Calendars**: Support for multiple regional/branch calendars (e.g., US Holidays vs. India Holidays) assigned to employees by location.

### 3.6 Module 06: Offboarding & Exit Management
- **Resignation Initiation**: Employee submits resignation with proposed last working date.
- **Notice Period Calculator**: Automatically computes expected last working date based on designation contract.
- **Exit Clearances**: Checklist for IT (laptop return, access revocation), Finance (travel settlement, expense claims), HR (exit interview, F&F document generation).

---

## 4. Acceptance Criteria

1. An employee in `PRE_JOINING` transitions to `PROBATION` automatically once onboarding checklist tasks are 100% complete.
2. Manager receives scheduled notifications for probation review; HR can confirm and issue confirmation letters.
3. Employee profile change requests route to the designated approver before database modification.
4. Resignation initiates multi-department exit clearance checklist; completion changes status to `EXITED`.
