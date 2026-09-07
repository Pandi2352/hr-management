# PeopleOS — Technical Architecture & Technology Stack

This document defines the technical stack, runtime topology, and progressive evolutionary stages of the **PeopleOS** platform, tailored for **MongoDB** as the primary document database.

---

## 1. Executive Technology Stack Summary

| Layer | Technology | Key Libraries & Ecosystem |
| :--- | :--- | :--- |
| **Frontend Web** | **React + TypeScript (Vite)** | React 19, Vite, Tailwind CSS, TanStack React Query v5, React Hook Form, Zod, Lucide Icons |
| **Backend API** | **NestJS + TypeScript** | NestJS 10, Mongoose / Typegoose, `@nestjs/mongoose`, class-validator, Passport JWT, Swagger / OpenAPI |
| **Primary Database**| **MongoDB 7.0+** | Replica Set (for ACID multi-document transactions), Mongoose schemas, compound & partial indexes |
| **Mobile App** | **React Native (Expo)** | React Native, Expo SDK, TypeScript, NativeWind / Tailwind, React Query |
| **Cache & Queue** | **Redis 7 & BullMQ** | Sub-millisecond caching, token blacklisting, distributed locking, background worker queues |
| **DevOps & Cloud** | **Docker & Compose** | Containerized dev/prod environments, MongoDB Replica Set local setup, GitHub Actions CI/CD |

---

## 2. System Architecture Evolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PEOPLEOS ARCHITECTURAL EVOLUTION                      │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│ STAGE 1: MODULAR        │ STAGE 2: CACHING &      │ STAGE 3: EVENT-DRIVEN   │
│          MONOLITH       │          ASYNC QUEUES   │          DISTRIBUTED    │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • React 19 + Vite (TS)  │ • React + Realtime WS   │ • React Web + Mobile App│
│ • Tailwind CSS          │ • NestJS Core API       │ • NestJS Core API       │
│ • NestJS (Modular)      │ • Redis (Cache / Locks) │ • Redis Pub/Sub Cluster │
│ • MongoDB + Mongoose    │ • BullMQ Background Wkr │ • Event Bus (Kafka/NATS)│
│ • Local In-Memory Queue │ • MongoDB Replica Set   │ • Dedicated Workers:    │
│                         │   (Read/Write split)    │   - Notification Worker │
│                         │                         │   - Report & BI Worker  │
│                         │                         │   - AI / LLM Worker     │
├─────────────────────────┴─────────────────────────┴─────────────────────────┤
│ STAGE 4: CLOUD NATIVE & MULTI-TENANT SAAS                                   │
│ • Multi-Tenant Partitioning (Tenant-ID embedded or dedicated MongoDB DBs)   │
│ • Kubernetes (EKS / GKE / Minikube) with Horizontal Pod Autoscaling (HPA)   │
│ • Distributed Tracing (OpenTelemetry) + Metrics (Prometheus / Grafana)      │
│ • Outbox Pattern + Distributed Redlock Locks                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Tier Deep Dive

### 3.1 Frontend Web Tier (`frontend/`)
- **Core**: React 19 with TypeScript, bundled via Vite for lightning-fast HMR and optimized tree-shaken builds.
- **Styling**: Tailwind CSS for scalable, utility-first design system management with consistent design tokens.
- **Component Primitives**: Headless UI / Radix UI for fully accessible, unstyled dropdowns, dialogs, drawers, and popovers.
- **Server State Management**: `@tanstack/react-query` v5 for caching, deduplicating, and background invalidation of API responses.
- **Forms & Validation**: `react-hook-form` paired with `@hookform/resolvers/zod` for zero unnecessary re-renders and strictly typed client-side schema validation.
- **Icons**: `lucide-react` for lightweight, consistent SVG iconography.

### 3.2 Backend API Tier (`backend/`)
- **Framework**: NestJS (TypeScript) with a strictly decoupled modular monolith architecture.
- **Architecture Flow**:
  $$\text{Controller} \longrightarrow \text{DTO Validation (class-validator)} \longrightarrow \text{Service} \longrightarrow \text{Model Repository (Mongoose)} \longrightarrow \text{MongoDB}$$
- **Authentication**: `passport-jwt` with short-lived access tokens (15 mins) and rotating refresh tokens (7 days).
- **Validation**: Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **API Documentation**: `@nestjs/swagger` generating real-time OpenAPI 3.0 specs at `/api/docs`.

### 3.3 Database Tier (`MongoDB 7.0+`)
- **ODM**: `Mongoose` (`@nestjs/mongoose`) with strict schemas, timestamps (`timestamps: true`), and schema-level validation.
- **Transactions**: Multi-document ACID transactions using MongoDB Replica Sets (`session.withTransaction()`) for critical lifecycle changes and leave deductions.
- **Document Model Strategy**:
  - **Embedded Documents**: Highly coupled, bounded sub-records (e.g., Emergency Contacts, Past Education, Approval Steps within an Approval Request, Punch Logs within an Attendance record).
  - **Referenced Documents**: Decoupled, large-growth entities (e.g., `Employee -> Department`, `LeaveRequest -> Employee`, `AuditLog -> User`) linked via `ObjectId`.
- **Soft Deletion**: Mongoose plugins / middleware filtering `{ isDeleted: false }` globally on queries.

### 3.4 Mobile Application Tier (`mobile-app/`)
- **Framework**: React Native with Expo SDK (TypeScript).
- **Styling**: NativeWind (Tailwind CSS for React Native) to share styling concepts with the web frontend.
- **Features**:
  - Biometric login (FaceID / TouchID via `expo-local-authentication`).
  - GPS Geofenced clock-in/out (`expo-location`).
  - Offline punch caching with auto-sync when network connectivity is restored.

---

## 4. Cross-Cutting Design Patterns with MongoDB

### 4.1 Multi-Document ACID Transactions
For operations affecting balances or multiple collections (e.g., confirming an employee, approving a leave and decrementing available days):

```typescript
const session = await this.connection.startSession();
session.startTransaction();
try {
  await this.leaveRequestModel.updateOne(
    { _id: requestId, status: 'PENDING' },
    { $set: { status: 'APPROVED', approvedBy: approverId } },
    { session },
  );

  await this.leaveBalanceModel.updateOne(
    { employeeId, leaveTypeId, year: currentYear },
    { $inc: { used: days, pendingApproval: -days } },
    { session },
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### 4.2 Non-Blocking Audit Logging
State-altering mutations publish audit payloads to a BullMQ worker queue; the worker inserts immutable records into the `audit_logs` MongoDB collection asynchronously.
