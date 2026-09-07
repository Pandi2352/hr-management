# PeopleOS — MongoDB Data Model & Collection Schema (MVP Releases 1–3)

This document defines the MongoDB collection structures, embedded sub-documents, references, validation schemas, and compound indexing strategies for **PeopleOS** utilizing **Mongoose & MongoDB 7.0+**.

---

## 1. Document Modeling Strategy: Embedding vs. Referencing

To optimize read/write performance in MongoDB:

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│        EMBEDDED DOCUMENTS (Sub-docs)         │        REFERENCED DOCUMENTS (ObjectId)       │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • Emergency Contacts (inside Employee)       │ • Organization (Multi-tenant root)           │
│ • Education & Experience (inside Employee)   │ • Departments & Designations                 │
│ • Skills & Certifications (inside Employee)  │ • Employees & User Accounts                  │
│ • Approval Steps (inside ApprovalRequest)    │ • Leave Requests & Balances                  │
│ • Punch Logs (inside AttendanceRecord)       │ • Audit Logs (High-write append-only)        │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. Common Mongoose Schema Plugin Standards

Every primary collection includes:
- `timestamps: true` (automatically adds `createdAt` and `updatedAt`).
- `isDeleted: { type: Boolean, default: false, index: true }` for soft deletes.
- `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true }`.
- `createdBy: { type: Schema.Types.ObjectId, ref: 'User' }`.
- `updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }`.

---

## 3. Core Collections (MVP Releases 1–3)

### 3.1 Organization Domain (`organizations`, `departments`, `designations`)

#### Collection: `organizations`
```typescript
@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string; // e.g. "ACME"

  @Prop({ trim: true })
  domain?: string;

  @Prop({ default: 'USD', uppercase: true })
  currency: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: false })
  isDeleted: boolean;
}
```

#### Collection: `departments`
```typescript
@Schema({ timestamps: true })
export class Department {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Department', default: null })
  parentId?: Types.ObjectId; // Hierarchical tree

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true })
  code: string;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee', default: null })
  headEmployeeId?: Types.ObjectId;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  status: string;

  @Prop({ default: false })
  isDeleted: boolean;
}
// Compound index: unique department code per organization
DepartmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });
```

#### Collection: `designations`
```typescript
@Schema({ timestamps: true })
export class Designation {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, uppercase: true })
  code: string;

  @Prop({ required: true, default: 1 })
  level: number; // 1 = Junior to 10 = Executive

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  status: string;

  @Prop({ default: false })
  isDeleted: boolean;
}
DesignationSchema.index({ organizationId: 1, code: 1 }, { unique: true });
```

---

### 3.2 Identity & Security (`users`, `roles`)

#### Collection: `users`
```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false }) // Excluded by default in queries
  passwordHash: string;

  @Prop({ 
    default: 'INVITED', 
    enum: ['INVITED', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'LOCKED'] 
  })
  status: string;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil?: Date;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date;

  @Prop({ type: [{ type: Schema.Types.ObjectId, ref: 'Role' }] })
  roles: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;
}
```

#### Collection: `roles`
```typescript
@Schema({ timestamps: true })
export class Role {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g. "HR_ADMIN", "MANAGER", "EMPLOYEE"

  @Prop({ type: [String], default: [] })
  permissions: string[]; // e.g. ["employee:create", "leave:approve", "attendance:read"]

  @Prop({ default: false })
  isSystem: boolean; // System roles cannot be deleted
}
RoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
```

---

### 3.3 Employee Domain (`employees`)

The `employees` collection leverages embedded sub-documents for fast single-query profile loading:

```typescript
// Sub-document schemas
const EmergencyContactSchema = new Schema({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
});

const EducationSchema = new Schema({
  degree: String,
  institution: String,
  passingYear: Number,
});

const ExperienceSchema = new Schema({
  companyName: String,
  designation: String,
  startDate: Date,
  endDate: Date,
});

const SkillSchema = new Schema({
  name: String,
  proficiency: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
});

const DocumentItemSchema = new Schema({
  title: String,
  documentType: { type: String, enum: ['RESUME', 'GOVT_ID', 'CONTRACT', 'EDUCATION'] },
  fileUrl: String,
  isVerified: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
});

@Schema({ timestamps: true })
export class Employee {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true })
  employeeCode: string; // e.g. "EMP-00142"

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  workEmail: string;

  @Prop({ trim: true })
  personalEmail?: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ type: Date })
  dateOfBirth?: Date;

  @Prop({ required: true, type: Date })
  dateOfJoining: Date;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Designation', required: true, index: true })
  designationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true })
  reportingManagerId?: Types.ObjectId;

  @Prop({ 
    default: 'PRE_JOINING', 
    enum: ['PRE_JOINING', 'ACTIVE', 'PROBATION', 'CONFIRMED', 'ON_LEAVE', 'SUSPENDED', 'NOTICE_PERIOD', 'EXITED', 'TERMINATED'] 
  })
  status: string;

  @Prop({ default: 'FULL_TIME', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] })
  employmentType: string;

  @Prop({ type: Date })
  probationEndDate?: Date;

  @Prop({ type: Date })
  confirmationDate?: Date;

  // Embedded Sub-documents
  @Prop({ type: [EmergencyContactSchema], default: [] })
  emergencyContacts: any[];

  @Prop({ type: [EducationSchema], default: [] })
  education: any[];

  @Prop({ type: [ExperienceSchema], default: [] })
  experience: any[];

  @Prop({ type: [SkillSchema], default: [] })
  skills: any[];

  @Prop({ type: [DocumentItemSchema], default: [] })
  documents: any[];

  @Prop({ default: false })
  isDeleted: boolean;
}

// Compound Unique Indexes
EmployeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, workEmail: 1 }, { unique: true });
```

---

### 3.4 Attendance & Leave Domain

#### Collection: `attendance_records`
```typescript
const PunchLogSchema = new Schema({
  timestamp: { type: Date, required: true },
  type: { type: String, enum: ['CLOCK_IN', 'CLOCK_OUT'], required: true },
  source: { type: String, enum: ['WEB', 'MOBILE', 'BIOMETRIC'], default: 'WEB' },
  location: {
    latitude: Number,
    longitude: Number,
  },
  ipAddress: String,
});

@Schema({ timestamps: true })
export class AttendanceRecord {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true, type: String, index: true }) // Stored as "YYYY-MM-DD" for indexing
  date: string;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Shift' })
  shiftId?: Types.ObjectId;

  @Prop({ type: Date })
  firstClockIn?: Date;

  @Prop({ type: Date })
  lastClockOut?: Date;

  @Prop({ default: 0 })
  workDurationMinutes: number;

  @Prop({ default: 0 })
  breakDurationMinutes: number;

  @Prop({ 
    default: 'ABSENT', 
    enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'] 
  })
  status: string;

  @Prop({ default: false })
  isLate: boolean;

  @Prop({ default: 0 })
  lateMinutes: number;

  @Prop({ default: false })
  isEarlyExit: boolean;

  @Prop({ default: 0 })
  overtimeMinutes: number;

  @Prop({ type: [PunchLogSchema], default: [] })
  punches: any[];
}
AttendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceRecordSchema.index({ organizationId: 1, date: 1 });
```

#### Collection: `leave_balances`
```typescript
@Schema({ timestamps: true })
export class LeaveBalance {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId: Types.ObjectId;

  @Prop({ required: true })
  year: number; // e.g. 2026

  @Prop({ default: 0 })
  openingBalance: number;

  @Prop({ default: 0 })
  accrued: number;

  @Prop({ default: 0 })
  used: number;

  @Prop({ default: 0 })
  pendingApproval: number;
}
LeaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });
```

#### Collection: `leave_requests`
```typescript
@Schema({ timestamps: true })
export class LeaveRequest {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({ required: true })
  totalDays: number;

  @Prop({ default: false })
  isHalfDay: boolean;

  @Prop({ enum: ['FIRST_HALF', 'SECOND_HALF'], default: null })
  halfDayPeriod?: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ 
    default: 'PENDING', 
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] 
  })
  status: string;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop()
  rejectionReason?: string;
}
```

---

### 3.5 Approval & Audit Log Domain

#### Collection: `approval_requests`
```typescript
const ApprovalStepSchema = new Schema({
  stepNumber: { type: Number, required: true },
  approverId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  comments: String,
  actionTimestamp: Date,
});

@Schema({ timestamps: true })
export class ApprovalRequest {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  requesterId: Types.ObjectId;

  @Prop({ required: true, enum: ['LEAVE', 'REGULARIZATION', 'PROFILE_CHANGE', 'RESIGNATION'] })
  entityType: string;

  @Prop({ required: true, type: Schema.Types.ObjectId })
  entityId: Types.ObjectId;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @Prop({ default: 1 })
  currentStep: number;

  @Prop({ type: [ApprovalStepSchema], default: [] })
  steps: any[];
}
```

#### Collection: `audit_logs` (Append-Only)
```typescript
@Schema({ timestamps: { createdAt: true, updatedAt: false } }) // Immutable
export class AuditLog {
  @Prop({ type: Schema.Types.ObjectId, ref: 'Organization', index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Schema.Types.ObjectId, ref: 'User', index: true })
  actorUserId?: Types.ObjectId;

  @Prop({ required: true })
  action: string; // "CREATE", "UPDATE", "DELETE", "APPROVE", "LOGIN"

  @Prop({ required: true, index: true })
  resource: string; // "Employee", "LeaveRequest", "Department"

  @Prop({ type: Schema.Types.ObjectId, index: true })
  resourceId?: Types.ObjectId;

  @Prop()
  clientIp?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Schema.Types.Mixed })
  oldValue?: any;

  @Prop({ type: Schema.Types.Mixed })
  newValue?: any;
}
AuditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
```
