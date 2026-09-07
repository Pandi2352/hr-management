# PeopleOS — Backend Setup & Architecture Guide

This document defines the exact folder structure, installation steps, and NestJS + MongoDB (Mongoose) integration for the **PeopleOS** backend application (`backend/`).

---

## 1. Backend Directory Structure

```
backend/src/
├── main.ts                  # Bootstrap: pipes, filters, CORS, Swagger, versioning
├── app.module.ts            # Root module wiring all feature modules
│
├── config/
│   ├── env.validation.ts    # Zod/class-validator schema for process.env
│   └── config.module.ts     # Global ConfigModule (typed config service)
│
├── database/
│   └── database.module.ts   # MongooseModule.forRootAsync (Mongo connection URI)
│
├── common/                  # Cross-cutting, reusable building blocks
│   ├── decorators/
│   │   ├── public.decorator.ts        # @Public() opts out of JwtAuthGuard
│   │   ├── roles.decorator.ts         # @Roles('ADMIN' | 'OPERATOR' | 'ANALYST')
│   │   └── current-user.decorator.ts  # @CurrentUser() from request
│   ├── guards/
│   │   ├── jwt-auth.guard.ts          # Global auth guard
│   │   └── roles.guard.ts             # RBAC guard
│   ├── interceptors/
│   │   ├── response.interceptor.ts    # { data, meta } envelope
│   │   └── logging.interceptor.ts     # Request timing/log
│   ├── filters/
│   │   └── all-exceptions.filter.ts   # Consistent { statusCode, code, message }
│   ├── pipes/
│   │   └── zod-validation.pipe.ts     # Validate body against shared Zod schemas
│   ├── dto/
│   │   └── pagination.dto.ts          # page, pageSize, sort, search, filter
│   ├── schemas/
│   │   └── base.schema.ts             # Shared schema options (timestamps, toJSON transform)
│   └── utils/
│       ├── pagination.ts              # buildMeta(total, page, pageSize) helper
│       └── mongo-query.ts             # sort/filter/search → Mongoose query + options
│
├── modules/                 # Feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts         # /auth/login, /auth/refresh, /auth/logout, /auth/me
│   │   ├── auth.service.ts            # credential check, token issue/rotate (bcrypt)
│   │   ├── strategies/jwt.strategy.ts
│   │   ├── schemas/session.schema.ts  # refresh-token sessions (revocable)
│   │   └── dto/                       # login.dto.ts, refresh.dto.ts
│   │
│   ├── users/                         # users + roles + permissions (RBAC)
│   │   ├── users.module.ts
│   │   ├── users.controller.ts        # CRUD, invite, suspend, role assign
│   │   ├── users.service.ts
│   │   ├── schemas/user.schema.ts
│   │   └── dto/
│   │
│   ├── products/                      # products, variants, categories, inventory
│   │   ├── products.module.ts
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   ├── schemas/product.schema.ts  # embeds variants[], images[]
│   │   ├── schemas/category.schema.ts
│   │   └── dto/
│   │
│   ├── orders/                        # order lifecycle + timeline + fulfilment
│   │   ├── orders.module.ts
│   │   ├── orders.controller.ts       # CRUD + /:id/transition
│   │   ├── orders.service.ts          # status state machine
│   │   ├── schemas/order.schema.ts    # embeds items[], timeline[], payment, shipment
│   │   └── dto/
│   │
│   ├── customers/
│   │   ├── customers.module.ts
│   │   ├── customers.controller.ts
│   │   ├── customers.service.ts
│   │   ├── schemas/customer.schema.ts # embeds addresses[]
│   │   └── dto/
│   │
│   ├── analytics/                     # dashboard KPIs + reports (aggregation)
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts    # /analytics/kpis, /sales, /categories, /reports
│   │   └── analytics.service.ts       # Mongo aggregation pipelines
│   │
│   ├── uploads/                       # product image uploads
│   │   ├── uploads.module.ts
│   │   ├── uploads.controller.ts      # multipart POST → { url }
│   │   └── uploads.service.ts         # local disk (dev) / S3 (prod)
│   │
│   └── realtime/                      # WebSocket gateway
│       ├── realtime.module.ts
│       └── realtime.gateway.ts        # emits order.created / order.updated / notification
│
├── seed/
│   └── seed.ts                        # Mongoose-based demo data seeder
│
└── health/
    └── health.controller.ts           # GET /health (Mongo ping)
```

---

## 2. Step-by-Step Backend Setup Guide (NestJS + MongoDB)

### Step 01: Scaffold the NestJS Project
Initialize the NestJS project inside the `backend/` directory using the Nest CLI:

```bash
cd d:\001-hr-management\backend
npx -y @nestjs/cli new . --skip-git --package-manager npm
```

### Step 02: Install Core Dependencies (Latest Versions)
Install database ODM, security, validation, OpenAPI, and WebSocket packages:

```bash
npm install @nestjs/mongoose mongoose @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/swagger @nestjs/websockets @nestjs/platform-socket.io socket.io zod
```

### Step 03: Install Development & Type Dependencies
Install required TypeScript type packages:

```bash
npm install -D @types/passport-jwt @types/bcrypt @types/multer
```

### Step 04: Configure Environment & Database Module
Set up environment validation (`src/config/env.validation.ts`) and register `MongooseModule.forRootAsync` in `src/database/database.module.ts` consuming `MONGODB_URI`.

### Step 05: Configure Global Middlewares & Swagger in `src/main.ts`
Wire up:
1. URI prefix: `api/v1`
2. CORS with origin whitelist
3. Global Validation Pipe with Zod
4. Global Response Interceptor (`{ success, data, meta }`)
5. Global Exception Filter (`AllExceptionsFilter`)
6. Swagger documentation module at `/api/docs`

### Step 06: Start Development Server
Run the NestJS application with hot reloading:

```bash
npm run start:dev
```
Verify the health check at `http://localhost:3000/api/v1/health` and Swagger documentation at `http://localhost:3000/api/docs`.
