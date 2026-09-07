import { diffAuditValues, sanitizeAuditValue } from './audit-sanitizer.util';

describe('sanitizeAuditValue', () => {
  it('drops secrets entirely rather than masking them', () => {
    const result = sanitizeAuditValue({
      email: 'user@peopleos.test',
      password: 'Sup3rSecret!',
      passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
      refreshToken: 'eyJhbGciOi...',
      otpHash: 'deadbeef',
      tokenHash: 'cafebabe',
    });

    expect(result).toEqual({ email: 'user@peopleos.test' });
    expect(JSON.stringify(result)).not.toContain('Sup3rSecret');
    expect(JSON.stringify(result)).not.toContain('$2b$');
  });

  it('masks financial and identity fields but keeps the last four characters', () => {
    const result = sanitizeAuditValue({
      bankAccountNumber: '123456789012',
      ssn: '111-22-3333',
      baseSalary: 8500000,
      city: 'Chennai',
    });

    expect(result.bankAccountNumber).toBe('••••••••9012');
    expect(result.ssn).toBe('••••••••3333');
    expect(result.baseSalary).toBe('••••••••0000');
    expect(result.city).toBe('Chennai');
  });

  it('matches secret keys regardless of casing or separators', () => {
    const result = sanitizeAuditValue({
      Current_Password: 'x',
      'refresh-token': 'y',
      API_KEY: 'z',
      keptField: 'visible',
    });

    expect(result).toEqual({ keptField: 'visible' });
  });

  it('sanitizes nested objects and array members', () => {
    const result = sanitizeAuditValue({
      user: { name: 'Anika', password: 'nested-secret' },
      sessions: [{ token: 'abc', device: 'chrome' }],
    });

    expect(result.user).toEqual({ name: 'Anika' });
    expect(result.sessions[0]).toEqual({ device: 'chrome' });
  });

  it('caps runaway arrays and long strings so one payload cannot bloat the log', () => {
    const result = sanitizeAuditValue({
      items: Array.from({ length: 60 }, (_, i) => i),
      note: 'x'.repeat(3000),
    });

    expect(result.items).toHaveLength(51);
    expect(result.items[50]).toBe('…and 10 more');
    expect(result.note).toMatch(/…\[truncated\]$/);
    expect(result.note.length).toBeLessThan(3000);
  });

  it('unwraps Mongoose documents before traversing them', () => {
    const doc = {
      toObject: () => ({ firstName: 'Anika', password: 'leak' }),
      $__internal: 'mongoose noise',
    };

    expect(sanitizeAuditValue(doc)).toEqual({ firstName: 'Anika' });
  });
});

describe('diffAuditValues', () => {
  it('records only the fields that changed', () => {
    const diff = diffAuditValues(
      { firstName: 'Anika', designationId: 'D1', phone: '+91 1' },
      { firstName: 'Anika', designationId: 'D2', phone: '+91 1' },
    );

    expect(diff).toEqual({
      oldValue: { designationId: 'D1' },
      newValue: { designationId: 'D2' },
    });
  });

  it('returns null when nothing meaningful changed', () => {
    const diff = diffAuditValues(
      { name: 'Engineering', updatedAt: new Date('2026-01-01') },
      { name: 'Engineering', updatedAt: new Date('2026-06-01') },
    );

    expect(diff).toBeNull();
  });

  it('keeps the single side of a create or delete', () => {
    const created = diffAuditValues(null, { name: 'Engineering' });
    expect(created?.oldValue).toBeNull();
    expect(created?.newValue).toEqual({ name: 'Engineering' });

    const deleted = diffAuditValues({ name: 'Engineering' }, null);
    expect(deleted?.oldValue).toEqual({ name: 'Engineering' });
    expect(deleted?.newValue).toBeNull();
  });

  it('never lets a changed secret through the diff', () => {
    const diff = diffAuditValues(
      { password: 'old-secret', status: 'ACTIVE' },
      { password: 'new-secret', status: 'SUSPENDED' },
    );

    expect(diff).toEqual({
      oldValue: { status: 'ACTIVE' },
      newValue: { status: 'SUSPENDED' },
    });
  });
});
