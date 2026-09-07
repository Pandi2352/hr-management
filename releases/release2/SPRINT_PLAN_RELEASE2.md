# PeopleOS — Release 2: Sprint Plan & Work Breakdown Structure

This sprint plan breaks down **Release 2 (Employee Operations)** into 4 structured, 2-week engineering sprints with clear deliverables, technical dependencies, and exit criteria.

---

## 1. Sprint Cadence Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RELEASE 2 SPRINT TIMELINE (8 WEEKS)                      │
├───────────────────────┬───────────────────────┬─────────────────────────────┤
│ SPRINT 5 (Weeks 1-2)  │ SPRINT 6 (Weeks 3-4)  │ SPRINT 7 (Weeks 5-6)        │
│ Onboarding Checklists │ Probation Workflows   │ Polymorphic Approvals       │
├───────────────────────┴───────────────────────┼─────────────────────────────┤
│ SPRINT 8 (Weeks 7-8)                          │ INTEGRATION & HARDENING     │
│ Policies, Holiday Calendars & Offboarding     │ Release Candidate 2 (RC2)   │
└───────────────────────────────────────────────┴─────────────────────────────┘
```

---

## 2. Sprint 5: Digital Onboarding Engine (Weeks 1–2)

### 2.1 Sprint Goal
Enable automated onboarding workflows with role-specific task assignments (HR, IT, Manager, Candidate) and document verification gates.

### 2.2 User Stories & Engineering Tasks
- [ ] **US-501 (BE)**: Create `onboardings` and `onboarding_tasks` Mongoose schemas with milestone gating logic.
- [ ] **US-502 (BE)**: Implement `/api/v1/lifecycle/onboarding` endpoints (create onboarding session, assign task checklists, toggle task status).
- [ ] **US-503 (BE)**: Implement candidate self-service document and bank details submission endpoint (`/api/v1/onboarding/candidate`).
- [ ] **US-504 (FE)**: Build `OnboardingTrackerPage` (`/lifecycle/onboarding`) with visual progress bars and status filters.
- [ ] **US-505 (FE)**: Build `OnboardingChecklistDetailPage` with role tab grouping (HR, IT, Manager, Employee).
- [ ] **US-506 (FE)**: Build `EmployeeSelfOnboardingPage` multi-step self-service wizard for new joiners.

### 2.3 Exit Deliverable
HR can assign checklists to new joiners; IT and HR can mark tasks complete; completed onboarding automatically transitions status to `PROBATION`.

---

## 3. Sprint 6: Probation Management & Lifecycle Transitions (Weeks 3–4)

### 3.1 Sprint Goal
Automate 30/60/90 day probation evaluations, manager ratings, confirmation approvals, promotions, and department transfers.

### 3.2 User Stories & Engineering Tasks
- [ ] **US-601 (BE)**: Create `probation_reviews` and `employee_lifecycles` Mongoose schemas with evaluation rating criteria.
- [ ] **US-602 (BE)**: Implement automated cron job checking upcoming probation end dates and emitting milestone notifications.
- [ ] **US-603 (BE)**: Implement `/api/v1/lifecycle/probation/evaluate` (Manager submit recommendation: Confirm, Extend, Terminate).
- [ ] **US-604 (BE)**: Implement `/api/v1/lifecycle/transitions` for promotions, department transfers, and manager reassignments.
- [ ] **US-605 (FE)**: Build `ProbationTrackerPage` (`/lifecycle/probation`) with urgency badges ("Due in 15 days").
- [ ] **US-606 (FE)**: Build `ProbationReviewDetailPage` with competency rating scales and recommendation radio group.
- [ ] **US-607 (FE)**: Build `PromotionsTransfersPage` and `PromotionTransferModal` with effective date picker.
- [ ] **US-608 (FE)**: Build `EmployeeLifecycleTimelinePage` (`/employees/:id/timeline`) displaying historical milestone cards.

### 3.3 Exit Deliverable
Managers can evaluate probationers; HR can approve confirmations or extensions; promotion and transfer audits are visible on employee timelines.

---

## 4. Sprint 7: Generic Multi-Tier Approval Framework (Weeks 5–6)

### 4.1 Sprint Goal
Establish a centralized, polymorphic approval engine routing requests through hierarchical manager chains with commenting and delegation.

### 4.2 User Stories & Engineering Tasks
- [ ] **US-701 (BE)**: Create `approval_requests` and `approval_steps` schemas supporting polymorphic target entities.
- [ ] **US-702 (BE)**: Build approval chain resolver dynamically calculating approvers based on reporting manager lines.
- [ ] **US-703 (BE)**: Implement `/api/v1/approvals` endpoints (Inbox, History, Action: Approve, Reject, Delegate).
- [ ] **US-704 (BE)**: Implement `/api/v1/requests` endpoints for employee profile updates and employment letters.
- [ ] **US-705 (FE)**: Build `MyRequestsPage` (`/requests`) with "New Request" modal.
- [ ] **US-706 (FE)**: Build `ApprovalsInboxPage` (`/approvals`) with bulk approval capabilities.
- [ ] **US-707 (FE)**: Build `ApprovalDetailPage` (`/approvals/:id`) with interactive multi-step visual chain stepper and comment stream.

### 4.3 Exit Deliverable
Employees can submit profile changes and letter requests; managers receive notifications and approve/reject with full audit history.

---

## 5. Sprint 8: Policies, Holiday Calendars & Exit Management (Weeks 7–8)

### 5.1 Sprint Goal
Deliver company policy acknowledgments, regional holiday calendars, and the formal resignation-to-clearance offboarding flow.

### 5.2 User Stories & Engineering Tasks
- [ ] **US-801 (BE)**: Create `company_policies`, `policy_acknowledgments`, `holidays`, and `exit_clearances` schemas.
- [ ] **US-802 (BE)**: Implement policy upload and digital acknowledgment endpoints (`/api/v1/policies/:id/acknowledge`).
- [ ] **US-803 (BE)**: Implement multi-region holiday calendar endpoints (`/api/v1/holidays`).
- [ ] **US-804 (BE)**: Implement exit workflow endpoints: Resignation submission, notice period calculation, and multi-department clearance sign-offs.
- [ ] **US-805 (FE)**: Build `CompanyPoliciesPage` (viewer + sign button) and `CompanyPoliciesAdminPage` (tracking acknowledgments).
- [ ] **US-806 (FE)**: Build `HolidayCalendarPage` (`/holidays`) with regional filters.
- [ ] **US-807 (FE)**: Build `ResignationPage`, `ExitManagementAdminPage`, `ExitClearanceDetailPage` (IT, Finance, Admin, HR checklists), and `ExitInterviewPage`.
- [ ] **US-808 (QA)**: Perform end-to-end regression testing across Release 1 and Release 2 integrations.

### 5.3 Exit Deliverable
Employees can view and acknowledge policies; regional holidays reflect on calendars; departing staff complete exit checklists cleanly.
