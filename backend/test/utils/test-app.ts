import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { generateUuid } from '../../src/common/utils/uuid.util';
import { ALL_PERMISSIONS, PERMISSIONS } from '../../src/common/constants/permissions.constant';

export const API = '/api/v1';

export interface TestContext {
  app: INestApplication;
  connection: Connection;
  organizationId: string;
  /** Wildcard-permission super admin. */
  admin: TestUser;
  /** Read-only EMPLOYEE role — the subject of the RBAC negative tests. */
  employeeUser: TestUser;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
}

/**
 * Boots the real AppModule against the e2e database with the production HTTP
 * stack, then seeds the minimum fixture the acceptance suite needs.
 *
 * The database is dropped up front rather than after, so a crashed run leaves
 * evidence behind instead of vanishing.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = configureApp(moduleRef.createNestApplication({ bodyParser: false }));
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());
  await connection.dropDatabase();

  const organizationId = generateUuid();
  await connection.collection('organizations').insertOne({
    _id: organizationId as any,
    legalName: 'PeopleOS E2E Ltd.',
    tradeName: 'PeopleOS E2E',
    registrationCode: 'REG-E2E-0001',
    corporateEmail: 'e2e@peopleos.test',
    timezone: 'Asia/Kolkata',
    currency: 'USD',
    fiscalYearStartMonth: 'January',
    status: 'ACTIVE',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const admin = await seedUser(connection, {
    organizationId,
    email: 'e2e.admin@peopleos.test',
    password: 'Admin@12345',
    roles: ['SUPER_ADMIN', 'HR_ADMIN'],
    permissions: ALL_PERMISSIONS,
  });

  const employeeUser = await seedUser(connection, {
    organizationId,
    email: 'e2e.employee@peopleos.test',
    password: 'Employee@12345',
    roles: ['EMPLOYEE'],
    // Self-service read only: no org, user or write permissions of any kind.
    permissions: [PERMISSIONS.EMPLOYEE_READ],
  });

  const ctx: TestContext = {
    app,
    connection,
    organizationId,
    admin: { ...admin, accessToken: '' },
    employeeUser: { ...employeeUser, accessToken: '' },
  };

  ctx.admin.accessToken = await login(app, admin.email, admin.password);
  ctx.employeeUser.accessToken = await login(app, employeeUser.email, employeeUser.password);

  return ctx;
}

export async function closeTestApp(ctx: TestContext | undefined) {
  if (!ctx) return;
  await ctx.app.close();
}

async function seedUser(
  connection: Connection,
  input: {
    organizationId: string;
    email: string;
    password: string;
    roles: string[];
    permissions: string[];
  },
): Promise<Omit<TestUser, 'accessToken'>> {
  const id = generateUuid();
  await connection.collection('users').insertOne({
    _id: id as any,
    organizationId: input.organizationId,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 10),
    firstName: 'E2E',
    lastName: 'Fixture',
    status: 'ACTIVE',
    roles: input.roles,
    permissions: input.permissions,
    failedLoginAttempts: 0,
    lockedUntil: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id, email: input.email, password: input.password };
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(`${API}/auth/login`)
    .send({ email, password });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Fixture login failed for ${email}: ${res.status} ${res.text}`);
  }
  return res.body.data.accessToken;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Creates a department through the API so the audit trail reflects real usage. */
export async function createDepartment(
  ctx: TestContext,
  name: string,
  code: string,
): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${API}/organization/departments`)
    .set(auth(ctx.admin.accessToken))
    .send({ name, code });

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Fixture department creation failed: ${res.status} ${res.text}`);
  }
  return res.body.data._id;
}
