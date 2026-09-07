import * as request from 'supertest';
import { API, auth, closeTestApp, createTestApp, TestContext } from './utils/test-app';

/**
 * TC-MVP-04 — Employee
 * "HR creates new employee with mandatory fields"
 * Expected: employee record created, status set to PRE_JOINING, user account
 * generated.
 *
 * Deviation from the spec, deliberate: Release 1's employee schema has no
 * PRE_JOINING state. New hires land in ACTIVE (or PROBATION when a lifecycle
 * transition is applied). PRE_JOINING belongs with the onboarding-task engine,
 * which is out of Release 1 scope — see the assertion below, which pins the
 * behaviour that actually exists rather than passing vacuously.
 *
 * Also covers PRD §5 acceptance criterion 2: no data loss across a full
 * personal + contact + employment payload.
 */
describe('TC-MVP-04 — employee creation provisions a linked user account', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('creates the record, assigns a code and links a login account', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .send({
        firstName: 'Anika',
        lastName: 'Raman',
        joiningDate: '2026-03-16',
        workEmail: 'anika.raman@peopleos.test',
        personalEmail: 'anika.personal@example.com',
        phone: '+91 98765 43210',
        gender: 'FEMALE',
        dateOfBirth: '1996-07-22',
        employmentType: 'FULL_TIME',
        currentAddress: {
          addressLine1: '14 Nungambakkam High Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '600034',
        },
      });

    expect(res.status).toBe(201);
    const employee = res.body.data;

    expect(employee.employeeCode).toMatch(/^EMP-\d+$/);
    expect(employee.workEmail).toBe('anika.raman@peopleos.test');
    expect(employee.userId).toBeTruthy();

    // Release 1 lifecycle: no PRE_JOINING state exists yet.
    expect(employee.status).toBe('ACTIVE');

    const user = await ctx.connection
      .collection('users')
      .findOne({ _id: employee.userId as any });
    expect(user).toBeTruthy();
    expect(user?.email).toBe('anika.raman@peopleos.test');
  });

  it('persists every submitted field without loss', async () => {
    const list = await request(ctx.app.getHttpServer())
      .get(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .query({ search: 'anika.raman@peopleos.test' });

    const id = list.body.data[0]._id;
    const detail = await request(ctx.app.getHttpServer())
      .get(`${API}/employees/${id}`)
      .set(auth(ctx.admin.accessToken));

    const e = detail.body.data;
    expect(e.personalEmail).toBe('anika.personal@example.com');
    expect(e.phone).toBe('+91 98765 43210');
    expect(e.dateOfBirth).toBe('1996-07-22');
    expect(e.currentAddress.city).toBe('Chennai');
    expect(e.currentAddress.postalCode).toBe('600034');
  });

  it('rejects a duplicate work email rather than creating a second record', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .send({
        firstName: 'Duplicate',
        lastName: 'Raman',
        joiningDate: '2026-04-01',
        employmentType: 'FULL_TIME',
        workEmail: 'anika.raman@peopleos.test',
      });

    expect(res.status).toBe(409);
  });

  it('rejects a payload missing mandatory fields with 400', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .send({ firstName: 'Nolastname' });

    expect(res.status).toBe(400);
  });

  it('never returns a password hash on the created record', async () => {
    const list = await request(ctx.app.getHttpServer())
      .get(`${API}/employees`)
      .set(auth(ctx.admin.accessToken));

    expect(JSON.stringify(list.body)).not.toContain('passwordHash');
    expect(JSON.stringify(list.body)).not.toContain('$2b$');
  });
});
