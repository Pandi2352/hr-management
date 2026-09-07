import * as request from 'supertest';
import { API, auth, closeTestApp, createTestApp, TestContext } from './utils/test-app';

/**
 * TC-MVP-01 — Auth
 * "User attempts login with invalid credentials 5 times"
 * Expected: account status transitions to LOCKED, returns HTTP 423.
 */
describe('TC-MVP-01 — account lockout after repeated failed logins', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('locks the account on the 5th failed attempt and answers 423 thereafter', async () => {
    const server = ctx.app.getHttpServer();
    const { email } = ctx.employeeUser;

    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await request(server)
        .post(`${API}/auth/login`)
        .send({ email, password: 'DefinitelyWrong@1' });
      statuses.push(res.status);
    }

    // The first four are ordinary credential rejections.
    expect(statuses.slice(0, 4)).toEqual([401, 401, 401, 401]);

    const user = await ctx.connection.collection('users').findOne({ email });
    expect(user?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(user?.lockedUntil).toBeTruthy();
    expect(new Date(user!.lockedUntil).getTime()).toBeGreaterThan(Date.now());

    // Even the *correct* password must now be refused, with 423 Locked.
    const locked = await request(server)
      .post(`${API}/auth/login`)
      .send({ email, password: ctx.employeeUser.password });

    expect(locked.status).toBe(423);
    expect(locked.body.message).toMatch(/lock/i);
  });

  it('records the lockout in the audit trail', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/audit/logs`)
      .set(auth(ctx.admin.accessToken))
      .query({ action: 'ACCOUNT_LOCKED' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].actorEmail).toBe(ctx.employeeUser.email);
  });

  it('never stores the attempted password anywhere in the audit trail', async () => {
    const rows = await ctx.connection.collection('audit_logs').find({}).toArray();
    const serialized = JSON.stringify(rows);

    expect(serialized).not.toContain('DefinitelyWrong@1');
    expect(serialized).not.toContain(ctx.employeeUser.password);
    expect(serialized).not.toContain('$2b$');
  });
});
