# PeopleOS — Release 3: Sprint Plan & Work Breakdown Structure

This sprint plan breaks down **Release 3 (Time & Leave Management)** into 4 structured, 2-week engineering sprints with clear deliverables, technical dependencies, and MVP exit criteria.

---

## 1. Sprint Cadence Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RELEASE 3 SPRINT TIMELINE (8 WEEKS)                      │
├───────────────────────┬───────────────────────┬─────────────────────────────┤
│ SPRINT 9 (Weeks 1-2)  │ SPRINT 10 (Weeks 3-4) │ SPRINT 11 (Weeks 5-6)       │
│ Time Clock & Shifts   │ Regularization Engine │ Leave Accruals & Balances   │
├───────────────────────┴───────────────────────┼─────────────────────────────┤
│ SPRINT 12 (Weeks 7-8)                         │ MVP CONVERGENCE & HARDENING │
│ Leave Calendar, Collision & Final MVP Release │ Official MVP Delivery (RC3) │
└───────────────────────────────────────────────┴─────────────────────────────┘
```

---

## 2. Sprint 9: Time Clock, Work Hours & Shifts (Weeks 1–2)

### 2.1 Sprint Goal
Enable web and mobile punch capture, work hour computation, shift configurations, and late/early departure detection.

### 2.2 User Stories & Engineering Tasks
- [ ] **US-901 (BE)**: Create `shifts` and `attendance_records` Mongoose schemas with compound unique index (`employeeId + date`).
- [ ] **US-902 (BE)**: Implement `/api/v1/attendance/punch` endpoint handling `CLOCK_IN` and `CLOCK_OUT` with IP and geolocation tracking.
- [ ] **US-903 (BE)**: Build work duration calculator service computing net hours, late minutes, early departures, and overtime.
- [ ] **US-904 (BE)**: Implement `/api/v1/attendance/shifts` CRUD endpoints.
- [ ] **US-905 (FE)**: Build `ClockInOutWidget` with live digital timer, punch status badges, and geofence indicators.
- [ ] **US-906 (FE)**: Build `MyAttendancePage` (`/attendance/my`) with monthly color-coded attendance calendar and daily detail drawer.
- [ ] **US-907 (FE)**: Build `ShiftManagementPage` with shift creation and grace period configuration modal.

### 2.3 Exit Deliverable
Employees can clock in/out; daily work hours calculate accurately against assigned shifts; attendance status updates in real-time.

---

## 3. Sprint 10: Attendance Regularization & Overtime (Weeks 3–4)

### 3.1 Sprint Goal
Provide dispute resolution workflows for missed punches and automated overtime/comp-off generation.

### 3.2 User Stories & Engineering Tasks
- [ ] **US-1001 (BE)**: Create `attendance_regularizations` schema linked to Release 2's approval engine.
- [ ] **US-1002 (BE)**: Implement `/api/v1/attendance/regularization` (raise dispute, manager approve/reject).
- [ ] **US-1003 (BE)**: Implement post-approval attendance recalculation transaction (`session.withTransaction()`).
- [ ] **US-1004 (BE)**: Implement daily attendance summary report aggregation endpoint (`/api/v1/attendance/daily`).
- [ ] **US-1005 (FE)**: Build `MyRegularizationPage` with "Raise Regularization" modal and proposed time pickers.
- [ ] **US-1006 (FE)**: Build `AttendanceRegularizationAdminPage` comparing actual logged punches vs. proposed times.
- [ ] **US-1007 (FE)**: Build `AttendanceDailyViewPage` (`/attendance/daily`) with live headcount metrics.

### 3.3 Exit Deliverable
Employees can regularize missed punches; manager approvals immediately update attendance records and work hours.

---

## 4. Sprint 11: Leave Types, Accrual & Balance Engine (Weeks 5–6)

### 4.1 Sprint Goal
Deliver custom leave types, automated monthly/annual accrual jobs, pro-rata calculations, and balance tracking.

### 4.2 User Stories & Engineering Tasks
- [ ] **US-1101 (BE)**: Create `leave_types`, `leave_policies`, and `leave_balances` Mongoose schemas.
- [ ] **US-1102 (BE)**: Implement automated accrual engine adding $+1.5\text{ days}$ monthly and pro-rating joiners.
- [ ] **US-1103 (BE)**: Implement `/api/v1/leave/balances` endpoint returning opening, accrued, used, and available balance.
- [ ] **US-1104 (BE)**: Implement balance adjustment endpoint for HR admins with audit tracking.
- [ ] **US-1105 (FE)**: Build `LeaveTypesPage` and `LeavePoliciesPage` with sandwich rule toggle and accrual frequency selectors.
- [ ] **US-1106 (FE)**: Build `MyLeavePage` (`/leave/my`) with circular progress rings and available balance cards.
- [ ] **US-1107 (FE)**: Build `LeaveBalancesPage` (`/leave/balances`) organization ledger with manual credit/debit modal.

### 4.3 Exit Deliverable
Organizations can configure leave policies; employee balances accrue automatically and reflect in self-service views.

---

## 5. Sprint 12: Leave Applications, Team Heatmap & MVP Release (Weeks 7–8)

### 5.1 Sprint Goal
Complete leave application workflows, collision warning detection, team heatmap calendars, and execute full MVP end-to-end acceptance testing.

### 5.2 User Stories & Engineering Tasks
- [ ] **US-1201 (BE)**: Create `leave_requests` schema with multi-document ACID transaction deducting balances on approval.
- [ ] **US-1202 (BE)**: Implement leave collision detection service warning when $> 25\%$ of a team is out.
- [ ] **US-1203 (BE)**: Implement `/api/v1/leave/team-calendar` aggregation endpoint.
- [ ] **US-1204 (FE)**: Build `MyLeaveApplyPage` with dynamic balance deduction calculator, half-day toggles, and document attachment.
- [ ] **US-1205 (FE)**: Build `LeaveApplicationsAdminPage` for manager and HR approval processing.
- [ ] **US-1206 (FE)**: Build `TeamLeaveCalendarPage` Gantt/Heatmap displaying department leaves.
- [ ] **US-1207 (FE)**: Build `AttendanceMonthlyReportPage` high-density payroll attendance export table (CSV/Excel).
- [ ] **US-1208 (QA)**: Execute end-to-end test suite for **MVP Completion** (Releases 1 + 2 + 3).

### 5.3 Exit Deliverable
**PeopleOS MVP is officially complete!** Ready for enterprise deployment covering Foundation, Lifecycle Operations, and Time & Leave.
