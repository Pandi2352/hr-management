import * as request from 'supertest';
import { API, auth, closeTestApp, createTestApp, TestContext } from './utils/test-app';

/**
 * TC-MVP-10 — Audit
 * "HR updates an employee's designation"
 * Expected: a new audit_logs entry capturing old and new designation.
 *
 * Also covers PRD §5 acceptance criterion 4 (before/after diffs) and the
 * append-only guarantee the audit trail is built on.
 */
describe('TC-MVP-10 — designation change produces a before/after audit diff', () => {
  let ctx: TestContext;
  let employeeId: string;
  let oldDesignationId: string;
  let newDesignationId: string;

  const createDesignation = async (title: string, code: string) => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${API}/organization/designations`)
      .set(auth(ctx.admin.accessToken))
      .send({ title, code });
    return res.body.data._id;
  };

  beforeAll(async () => {
    ctx = await createTestApp();
    oldDesignationId = await createDesignation('Software Engineer', 'SE');
    newDesignationId = await createDesignation('Senior Software Engineer', 'SSE');

    const created = await request(ctx.app.getHttpServer())
      .post(`${API}/employees`)
      .set(auth(ctx.admin.accessToken))
      .send({
        firstName: 'Promo',
        lastName: 'Candidate',
        joiningDate: '2026-01-12',
        employmentType: 'FULL_TIME',
        workEmail: 'promo.candidate@peopleos.test',
        designationId: oldDesignationId,
      });
    employeeId = created.body.data._id;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('writes an audit row holding the old and new designation', async () => {
    const update = await request(ctx.app.getHttpServer())
      .patch(`${API}/employees/${employeeId}`)
      .set(auth(ctx.admin.accessToken))
      .send({ designationId: newDesignationId });
    expect(update.status).toBe(200);

    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/audit/logs`)
      .set(auth(ctx.admin.accessToken))
      .query({ resourceId: employeeId, action: 'UPDATE' });

    expect(res.status).toBe(200);
    const entry = res.body.data[0];
    expect(entry).toBeTruthy();
    expect(entry.oldValue.designationId).toBe(oldDesignationId);
    expect(entry.newValue.designationId).toBe(newDesignationId);
    expect(entry.actorUserId).toBe(ctx.admin.id);
  });

  it('records only the changed fields, not the whole document', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/audit/logs`)
      .set(auth(ctx.admin.accessToken))
      .query({ resourceId: employeeId, action: 'UPDATE' });

    const entry = res.body.data[0];
    expect(Object.keys(entry.newValue)).toEqual(['designationId']);
    expect(Object.keys(entry.oldValue)).toEqual(['designationId']);
  });

  it('captures the request correlation id and actor identity', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/audit/logs`)
      .set(auth(ctx.admin.accessToken))
      .query({ resourceId: employeeId, action: 'UPDATE' });

    const entry = res.body.data[0];
    expect(entry.requestId).toMatch(/^REQ-/);
    expect(entry.actorEmail).toBe(ctx.admin.email);
  });

  it('exposes no write routes — the trail is append-only over HTTP', async () => {
    const server = ctx.app.getHttpServer();
    const token = auth(ctx.admin.accessToken);

    const list = await request(server).get(`${API}/audit/logs`).set(token);
    const id = list.body.data[0]._id;

    const results = await Promise.all([
      request(server).patch(`${API}/audit/logs/${id}`).set(token).send({ action: 'TAMPERED' }),
      request(server).delete(`${API}/audit/logs/${id}`).set(token),
      request(server).post(`${API}/audit/logs`).set(token).send({ action: 'FORGED' }),
    ]);

    for (const res of results) {
      expect(res.status).toBe(404);
    }

    const stored = await ctx.connection.collection('audit_logs').findOne({ _id: id as any });
    expect(stored?.action).not.toBe('TAMPERED');
  });

  it('audits its own export, so reading the trail is itself traceable', async () => {
    await request(ctx.app.getHttpServer())
      .get(`${API}/audit/logs/export`)
      .set(auth(ctx.admin.accessToken));

    const res = await request(ctx.app.getHttpServer())
      .get(`${API}/audit/logs`)
      .set(auth(ctx.admin.accessToken))
      .query({ action: 'EXPORT' });

    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
