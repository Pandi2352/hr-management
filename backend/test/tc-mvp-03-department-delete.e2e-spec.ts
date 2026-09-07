import * as request from 'supertest';
import {
  API,
  auth,
  closeTestApp,
  createDepartment,
  createTestApp,
  TestContext,
} from './utils/test-app';

/**
 * TC-MVP-03 — Org
 * "Admin deletes a department containing active employees"
 * Expected: validation error preventing orphan employee records.
 */
describe('TC-MVP-03 — department deletion is blocked while staff remain', () => {
  let ctx: TestContext;
  let departmentId: string;
  let spareDepartmentId: string;
  let employeeId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    departmentId = await createDepartment(ctx, 'Engineering', 'ENG');
    spareDepartmentId = await createDepartment(ctx, 'Platform', 'PLT');

    const created = await request(ctx.app.getHttpServer())
      .post(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .send({
        firstName: 'Dept',
        lastName: 'Occupant',
        joiningDate: '2026-02-01',
        employmentType: 'FULL_TIME',
        workEmail: 'dept.occupant@peopleos.test',
        departmentId,
      });
    employeeId = created.body.data._id;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('refuses the delete and names the blocking headcount', async () => {
    const res = await request(ctx.app.getHttpServer())
      .delete(`${API}/organization/departments/${departmentId}`)
      .set(auth(ctx.admin.accessToken));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/1 active employee is still assigned/i);
  });

  it('leaves the department intact after the refused delete', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/organization/departments/${departmentId}`)
      .set(auth(ctx.admin.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.isDeleted).toBeFalsy();
  });

  it('also refuses a department that has sub-departments', async () => {
    const child = await createDepartment(ctx, 'Engineering Tools', 'ENGT');
    await request(ctx.app.getHttpServer())
      .patch(`${API}/organization/departments/${child}/parent`)
      .set(auth(ctx.admin.accessToken))
      .send({ parentId: spareDepartmentId });

    const res = await request(ctx.app.getHttpServer())
      .delete(`${API}/organization/departments/${spareDepartmentId}`)
      .set(auth(ctx.admin.accessToken));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/sub-departments/i);
  });

  it('permits the delete once the employee is reassigned', async () => {
    await request(ctx.app.getHttpServer())
      .patch(`${API}/employees/${employeeId}`)
      .set(auth(ctx.admin.accessToken))
      .send({ departmentId: spareDepartmentId });

    const res = await request(ctx.app.getHttpServer())
      .delete(`${API}/organization/departments/${departmentId}`)
      .set(auth(ctx.admin.accessToken));

    expect(res.status).toBe(200);

    // Soft delete: the row survives so audit references stay resolvable.
    const dept = await ctx.connection
      .collection('departments')
      .findOne({ _id: departmentId as any });
    expect(dept?.isDeleted).toBe(true);
  });
});
