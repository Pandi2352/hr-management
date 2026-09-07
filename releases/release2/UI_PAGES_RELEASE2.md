# PeopleOS — Release 2: UI Pages List & Inventory

This document defines the complete list of frontend UI pages, views, modals, and drawers required specifically for **Release 2 (Employee Operations)**.

---

## 1. Onboarding & Probation Pages

### 1.1 `OnboardingTrackerPage` (`/lifecycle/onboarding`)
- HR operational tracker displaying all active new joiners.
- Visual progress bar per candidate (e.g., 8/10 tasks complete).
- Filter by status (`Pre-Joining`, `In-Progress`, `Completed`, `Overdue`), Department, and Joining Date.
- Action: "Trigger Reminder", "View Checklist", "Manually Complete".

### 1.2 `OnboardingChecklistDetailPage` (`/lifecycle/onboarding/:id`)
- Full checklist breakdown categorized by task owner:
  - **HR Tasks**: Contract verified, background check, statutory forms.
  - **IT Tasks**: Email generated, laptop dispatched, tools access granted.
  - **Manager Tasks**: Mentor assigned, 30-day goals defined, team intro scheduled.
  - **Employee Tasks**: Bank account uploaded, emergency contacts submitted, policies signed.
- Interactive task completion toggles with file upload attachments.

### 1.3 `EmployeeSelfOnboardingPage` (`/onboarding/wizard`)
- Candidate self-service onboarding wizard:
  - *Step 1*: Personal & Contact Details Confirmation.
  - *Step 2*: Bank & Tax Details Upload (Cancelled Cheque, Tax ID).
  - *Step 3*: Document Upload (Degree certificates, prior experience letters).
  - *Step 4*: Review & Sign Company Policies.

### 1.4 `ProbationTrackerPage` (`/lifecycle/probation`)
- HR tracker for employees currently on probation.
- Columns: Employee Name, Department, Joining Date, Probation End Date, Days Remaining, Evaluation Status (`Pending Manager`, `Under HR Review`, `Confirmed`, `Extended`).
- Filter: "Due in 15 days", "Due in 30 days", "Overdue".

### 1.5 `ProbationReviewDetailPage` (`/lifecycle/probation/:id`)
- Manager and HR evaluation view.
- 4-point rating scales across Key Performance Dimensions.
- Manager recommendation selector: `Confirm`, `Extend (30/60/90 days)`, `Terminate`.
- Manager comments and HR final sign-off modal.

---

## 2. Lifecycle Transitions: Promotions, Transfers & History

### 2.1 `PromotionsTransfersPage` (`/lifecycle/transitions`)
- Central hub for managing role changes, department transfers, and promotions.
- Sub-tabs: "Active Requests", "Scheduled Transitions", "Past Transition History".
- Button: "Initiate Promotion / Transfer".

### 2.2 `PromotionTransferModal` (Action Modal)
- Wizard selecting:
  - Target Employee.
  - Transition Type (`PROMOTION`, `DEPARTMENT_TRANSFER`, `MANAGER_CHANGE`, `SALARY_REVISION`).
  - Effective Date.
  - Proposed Designation / Department / Manager.
  - Justification and attached appraisal notes.

### 2.3 `EmployeeLifecycleTimelinePage` (`/employees/:id/timeline`)
- Interactive vertical timeline showing every historical milestone for an employee:
  - Date of Joining $\to$ Probation Confirmation $\to$ Promotion to Senior $\to$ Transfer to Product Team $\to$ Reporting Line Change.

---

## 3. Employee Requests & Approvals

### 3.1 `MyRequestsPage` (`/requests`)
- Employee portal listing all requests raised by the user.
- Sub-tabs: "Active Requests", "Past Completed Requests".
- Types: Profile Change, Address Change, Employment Verification Letter, Bank Account Update.
- Status badges: `Submitted`, `Under Review`, `Approved`, `Rejected`.

### 3.2 `NewRequestModal` (Action Modal)
- Request type selector.
- Dynamic input fields based on request type (e.g., Bank change requires Account #, IFSC/Routing #, and document proof).

### 3.3 `ApprovalsInboxPage` (`/approvals`)
- Centralized manager & HR action inbox for all pending approvals.
- Quick filter tabs: "All", "Profile Requests", "Probation Reviews", "Resignations", "Leaves".
- Table with bulk approve/reject capabilities.

### 3.4 `ApprovalDetailPage` (`/approvals/:id`)
- Complete request snapshot with before/after diffs.
- Interactive multi-step approval chain stepper (`Manager -> Dept Head -> HR`).
- Comment history stream with internal/public message distinction.
- Action buttons: `Approve`, `Reject`, `Delegate`, `Request More Info`.

---

## 4. Company Policies & Holiday Calendars

### 4.1 `CompanyPoliciesPage` (`/policies`)
- Employee-facing document knowledge base.
- Search and category filters (HR Policies, Code of Conduct, Travel & Expense, IT Security).
- PDF document viewer with "Acknowledge & Sign" action button.

### 4.2 `CompanyPoliciesAdminPage` (`/organization/policies`)
- Admin policy manager to upload new policies (PDF), set effective dates, and track employee acknowledgment percentages.
- Acknowledgment report download (CSV).

### 4.3 `HolidayCalendarPage` (`/holidays`)
- Monthly/yearly calendar displaying official company holidays and optional holidays.
- Regional location selector (e.g., "New York Office" vs "Bangalore Office").
- Admin action: "Add Holiday" modal (Name, Date, Type: Mandatory vs Floating, Applicable Locations).

---

## 5. Offboarding & Exit Management

### 5.1 `ResignationPage` (`/lifecycle/resignation`)
- Employee self-service resignation submission form.
- Inputs: Reason for Leaving, Proposed Last Working Date, Personal Feedback.
- Real-time notice period compliance calculator based on contract days.

### 5.2 `ExitManagementAdminPage` (`/lifecycle/exits`)
- HR command center for managing departing staff.
- Columns: Employee, Department, Resignation Date, Expected Last Day, Clearance Status, Exit Interview Status.
- Quick actions: "Approve Resignation", "Revise Last Working Date", "Start Clearance".

### 5.3 `ExitClearanceDetailPage` (`/lifecycle/exits/:id`)
- Multi-department clearance dashboard:
  - **IT Clearance**: Laptop received, email suspended, GitHub/Slack access revoked.
  - **Finance Clearance**: Travel advances cleared, corporate card cancelled, expense claims settled.
  - **Admin Clearance**: ID badge returned, parking pass revoked.
  - **HR Clearance**: Exit interview conducted, Full & Final (F&F) settlement calculated.
- Digital sign-off button per department lead.

### 5.4 `ExitInterviewPage` (`/lifecycle/exits/:id/interview`)
- Confidential exit interview questionnaire:
  - Reasons for departure, satisfaction with leadership, compensation, culture ratings, and retention feedback.
