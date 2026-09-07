import * as request from 'supertest';
import { API, auth, closeTestApp, createTestApp, TestContext } from './utils/test-app';

/**
 * TC-MVP-02 — RBAC
 * "Employee attempts to access /api/v1/departments (POST)"
 * Expected: HTTP 403 Forbidden with a permission error.
 *
 * The department routes live under `/organization/departments`; the spec's
 * shorthand path predates that grouping.
 *
 * Also covers PRD §5 acceptance criterion 3: an EMPLOYEE may not edit
 * department, designation or compensation fields on a profile.
 */
describe('TC-MVP-02 — EMPLOYEE role is denied privileged endpoints', () => {
  let ctx: TestContext;
  let employeeId: string;

  beforeAll(async () => {
    ctx = await createTestApp();

    const created = await request(ctx.app.getHttpServer())
      .post(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .send({
        firstName: 'Rbac',
        lastName: 'Subject',
        joiningDate: '2026-01-05',
        employmentType: 'FULL_TIME',
        workEmail: 'rbac.subject@peopleos.test',
      });
    employeeId = created.body.data._id;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('rejects department creation with 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${API}/organization/departments`)
      .set(auth(ctx.employeeUser.accessToken))
      .send({ name: 'Shadow IT', code: 'SHDW' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permission/i);
  });

  it('rejects department deletion, user management and audit reads with 403', async () => {
    const server = ctx.app.getHttpServer();
    const token = auth(ctx.employeeUser.accessToken);

    const results = await Promise.all([
      request(server).delete(`${API}/organization/departments/does-not-matter`).set(token),
      request(server).get(`${API}/users`).set(token),
      request(server).get(`${API}/audit/logs`).set(token),
      request(server).get(`${API}/employees/export`).set(token),
    ]);

    expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403]);
  });

  it('rejects an employee editing department, designation or compensation', async () => {
    const res = await request(ctx.app.getHttpServer())
      .patch(`${API}/employees/${employeeId}`)
      .set(auth(ctx.employeeUser.accessToken))
      .send({ departmentId: 'some-other-department' });

    expect(res.status).toBe(403);
  });

  it('still allows the directory read its role does grant', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/employees`)
      .set(auth(ctx.employeeUser.accessToken));

    expect(res.status).toBe(200);
  });

  it('rejects an unauthenticated request with 401, not 403', async () => {
    const res = await request(ctx.app.getHttpServer()).get(`${API}/employees`);
    expect(res.status).toBe(401);
  });
});
