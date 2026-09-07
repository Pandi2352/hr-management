# PeopleOS — Release 3: UI Pages List & Inventory

This document defines the complete list of frontend UI pages, views, widgets, and modals required specifically for **Release 3 (Time & Leave Management)**.

---

## 1. Attendance & Punch Clock Pages

### 1.1 `ClockInOutWidget` (Global / Dashboard Component)
- Persistent / Dashboard clock card with live digital timer.
- Primary CTA toggle: "Punch In" / "Punch Out".
- Indicator badge: Shift timings, current punch status (`Not Clocked In`, `On Duty`, `On Break`).
- Geolocation verification status and IP address badge.

### 1.2 `MyAttendancePage` (`/attendance/my`)
- Employee monthly attendance calendar and log view.
- Color-coded daily cells: `Present` (Green), `Late` (Amber), `Half-Day` (Orange), `Absent` (Red), `Holiday` (Blue), `Weekly Off` (Gray).
- Daily detail drawer on cell click showing:
  - First punch in, last punch out, total work hours, break hours, late arrival minutes.
- Button: "Request Regularization" for days with missed punches or discrepancies.

### 1.3 `AttendanceDailyViewPage` (`/attendance/daily`)
- HR and Manager daily attendance command center.
- Top metrics: Total Expected, Present Count, Late Arrivals, Early Exits, Absent / On-Leave.
- Filterable table: Search by employee, department, shift, or punch status.
- Real-time refresh indicator.

### 1.4 `AttendanceMonthlyReportPage` (`/attendance/monthly-report`)
- High-density payroll-ready attendance matrix table:
  - Rows: Employees.
  - Columns: Days of month (1 to 31) with status codes (P, A, HD, L, WO, H).
  - Summary columns: Total Working Days, Days Present, Days Absent, Paid Leaves, LOP Days.
- Actions: "Export Excel / CSV", "Recalculate Month".

---

## 2. Shift Management & Rostering Pages

### 2.1 `ShiftManagementPage` (`/attendance/shifts`)
- Catalog of all company work shifts.
- Columns: Shift Name, Timings (`09:00 - 18:00`), Grace Period, Full Day Hours, Half Day Hours, Assigned Staff Count, Night Shift indicator.
- Action: "Create Shift" modal.

### 2.2 `ShiftRosterPage` (`/attendance/roster`)
- Visual grid roster displaying shift assignments across departments and weeks.
- Filter by Department, Location, and Date Range.
- Drag-and-drop or dropdown shift reassignment per employee.
- Bulk action: "Assign Rotational Shift Pattern".

---

## 3. Regularization & Overtime Pages

### 3.1 `MyRegularizationPage` (`/attendance/regularization`)
- Employee portal for tracking raised attendance dispute requests.
- Sub-tabs: "Pending Requests", "Resolved Requests".
- Button: "Raise Regularization".

### 3.2 `RegularizationRequestModal` (Action Modal)
- Date picker (disabled for future dates).
- Proposed Clock-In time and Clock-Out time.
- Reason dropdown: "Missed Punch", "On-site Client Visit", "Biometric Hardware Failure", "Official Travel".
- Detailed explanation notes and optional file attachment.

### 3.3 `AttendanceRegularizationAdminPage` (`/attendance/regularizations/approvals`)
- Manager & HR approval queue for regularization requests.
- Side-by-side comparison: Actual logged biometric punches vs. Proposed corrected times.
- Action buttons: `Approve` (triggers instant attendance recalculation), `Reject`.

---

## 4. Leave Management & Balance Engine Pages

### 4.1 `MyLeavePage` (`/leave/my`)
- Employee leave hub showing current balances per leave type:
  - Casual Leave (CL): Available / Total Quota.
  - Sick Leave (SL): Available / Total Quota.
  - Earned Leave (EL): Available / Total Quota.
  - Comp-Off: Available Balance.
- Progress bars showing used vs. available days.
- Recent leave history table with status badges.
- Primary CTA: "Apply Leave".

### 4.2 `MyLeaveApplyPage` (`/leave/apply`)
- Interactive leave application form:
  - Leave type selector with dynamic live balance preview.
  - Date range picker (Single day, multi-day).
  - Half-day toggle (`First Half` / `Second Half`).
  - Net calculated leave days (auto-excluding weekends and holidays).
  - Reason textarea.
  - File upload attachment (mandatory for medical leaves $> 2\text{ days}$).
  - Collision preview: "1 other teammate is on leave during this period".

### 4.3 `LeaveApplicationsAdminPage` (`/leave/applications`)
- HR and Manager inbox for pending leave requests.
- Filter by Department, Leave Type, Date Range, Status (`Pending`, `Approved`, `Rejected`).
- Bulk approval actions.

### 4.4 `TeamLeaveCalendarPage` (`/leave/team-calendar`)
- Interactive multi-employee Gantt / Heatmap timeline:
  - Horizontal calendar showing overlapping leaves across the department.
  - Capacity indicator: Flags days where team availability drops below critical threshold (e.g., $< 70\%$).

### 4.5 `LeaveBalancesPage` (`/leave/balances`)
- Organization-wide employee leave balance ledger.
- Search and filter by employee and leave type.
- Admin adjustment modal: "Manually Credit / Debit Leave Days" with audit explanation.

### 4.6 `LeavePoliciesPage` (`/leave/policies`)
- Policy configuration engine:
  - Accrual frequency (Monthly vs. Yearly).
  - Pro-rata rules for new joiners.
  - Max annual allocation.
  - Max carry-forward limit and expiry dates.
  - Sandwich rule toggle switch.
  - Encashment eligibility rules.

### 4.7 `LeaveTypesPage` (`/leave/types`)
- Create and edit custom leave types (e.g., "Maternity Leave", "Paternity Leave", "Study Leave", "Bereavement").
- Settings: Paid vs. Unpaid, requires document attachment, minimum notice period required.
