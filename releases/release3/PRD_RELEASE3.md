# PeopleOS — Release 3: Time & Leave Management (PRD)

| Document Version | Phase | Target Audience | Status |
| :--- | :--- | :--- | :--- |
| **1.0.0** | **Release 3 (Time & Leave — Final MVP Phase)** | Engineering, Product, HR Ops, People Managers, QA | **Approved** |

---

## 1. Executive Summary & Vision

**Release 3 (Time & Leave)** completes the **PeopleOS Minimum Viable Product (MVP)**. It provides real-time work hour tracking, operational shift scheduling, automated attendance calculations, missed-punch regularizations, and an enterprise leave accrual and balance engine.

With Release 3, PeopleOS delivers the complete operational trinity:
$$\text{Release 1 (Foundation)} + \text{Release 2 (Operations)} + \text{Release 3 (Time \& Leave)} = \mathbf{Full\ Enterprise\ MVP}$$

---

## 2. Release 3 Modules & Functional Scope

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RELEASE 3: TIME & LEAVE ENGINE SCOPE                    │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Time Clock & Punch In/Out         │ 2. Shifts, Rostering & Schedules     │
│ • Web & Mobile Punch Capture         │ • Standard, Rotational & Night Shifts│
│ • Geolocation & IP Restrictions      │ • Shift Assignments & Rotations      │
│ • Real-time Work Hour Calculation    │ • Grace Periods (Late/Early Exit)    │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. Attendance Regularization         │ 4. Leave Types & Accrual Engine      │
│ • Missed Punch Dispute Workflow      │ • Configurable Leave Types (CL, SL)  │
│ • Manager Approval Sign-Off          │ • Monthly / Annual Accrual Logic     │
│ • Overtime Hours & Comp-Off Credits  │ • Pro-rata Calculation for Joiners   │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 5. Leave Balances & Carry Forward    │ 6. Leave Applications & Calendar     │
│ • Opening, Accrued, Used, Available  │ • Half-Day & Multi-day Applications  │
│ • Carry-forward Caps & Expirations   │ • Sandwich Rule Enforcement          │
│ • Encashment Calculations            │ • Team Leave Heatmap & Overlap Alerts│
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. Core Functional Requirements

### 3.1 Module 01: Time Clock & Punch In/Out
- **Punches**: Records timestamp, punch type (`CLOCK_IN`, `CLOCK_OUT`), source (`WEB`, `MOBILE`), IP address, and optional geolocation coordinates.
- **Work Duration Engine**: Net work duration calculated automatically in minutes, excluding logged break intervals.
- **Automatic Auto-Punch-Out**: System auto-closes punches after 16 hours of inactivity with an auto-flag for regularization.

### 3.2 Module 02: Shifts & Rostering
- **Shift Definitions**: Name, start time, end time, grace period (default: 15 mins), half-day minimum threshold (e.g., 4.5 hours), full-day minimum threshold (e.g., 8.0 hours), and night shift flag.
- **Rules Engine**:
  - *Late Arrival*: Punch In $>$ Shift Start Time $+$ Grace Period.
  - *Early Exit*: Punch Out $<$ Shift End Time $-$ Grace Period.
  - *Overtime*: Daily work duration exceeding shift hours by $> 30\text{ mins}$.
- **Roster Assignments**: Assign shifts to individuals, entire departments, or automated weekly/monthly rotations.

### 3.3 Module 03: Attendance Regularization & Overtime
- **Dispute Workflow**: Employee raises a regularization request specifying proposed clock-in/out times, reason (e.g., Client Visit, Forgot Punch, Hardware Failure).
- **Approval Flow**: Routes to immediate Reporting Manager via Release 2's generic approval engine. Approval triggers automatic recalculation of attendance status, late minutes, and work duration.
- **Comp-Off Generation**: Working on designated weekends or official holidays automatically generates compensatory off credits upon manager verification.

### 3.4 Module 04: Leave Types & Accrual Engine
- **Configurable Policies**:
  - Casual Leave (CL)
  - Sick Leave (SL)
  - Earned / Privilege Leave (EL/PL)
  - Compensatory Off (Comp-Off)
  - Loss of Pay / Unpaid Leave (LOP)
  - Maternity & Paternity Leave
- **Accrual Logic**:
  - Monthly accrual ($+1.5\text{ days}$ on the 1st of every month).
  - Annual lump-sum allocation on fiscal year start.
  - Pro-rata calculation for employees joining mid-accrual cycle.

### 3.5 Module 05: Leave Balances & Carry Forward
- **Balance Equation**:
  $$\text{Available Balance} = \text{Opening Balance} + \text{Accrued} - \text{Used} - \text{Pending Approval}$$
- **Year-End Carry Forward**: Configurable maximum carry-forward limit (e.g., max 10 days carry forward; remaining days lapse or enter encashment pool).

### 3.6 Module 06: Leave Applications & Team Calendar
- **Leave Submission**: Single day, multi-day, or half-day (`FIRST_HALF`, `SECOND_HALF`) with mandatory reason and document attachment (e.g., medical certificate for $> 2\text{ days}$ sick leave).
- **Sandwich Rule (Configurable)**: If an employee takes Friday and Monday as leave, weekend days (Saturday & Sunday) are counted towards leave deduction.
- **Team Availability & Collision Detection**: Warns manager during approval if $> 25\%$ of the team is already on approved leave for the requested dates.

---

## 4. Acceptance Criteria (MVP Completion)

1. Employee can clock in/out via web UI, and daily work hours update in real-time.
2. Clocking in past grace period automatically marks record as `is_late = true` and logs exact late minutes.
3. Submitting a regularization recalculates work hours upon manager approval and updates attendance status to `PRESENT`.
4. Leave application automatically validates available balance and rejects requests with insufficient days.
5. Approved leaves immediately deduct from available balance and reflect on the team visual leave calendar.
