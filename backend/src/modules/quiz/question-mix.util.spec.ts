import {
  defaultMix,
  describeMix,
  mixToSlices,
  mixTotal,
  normalizeMix,
  outstandingMix,
} from './question-mix.util';

describe('defaultMix', () => {
  it('keeps a short quiz to single choice', () => {
    expect(defaultMix(3)).toEqual({ SINGLE: 3 });
    expect(defaultMix(1)).toEqual({ SINGLE: 1 });
  });

  it('always adds up to what was asked for', () => {
    for (const total of [4, 5, 6, 7, 10, 15, 20, 37, 50]) {
      expect(mixTotal(defaultMix(total))).toBe(total);
    }
  });

  it('brings in the other types once a quiz can carry them', () => {
    const mix = defaultMix(10);
    expect(Object.keys(mix).length).toBeGreaterThan(2);
    expect(mix.SINGLE).toBeGreaterThan(0);
  });

  it('asks for nothing when nothing was asked for', () => {
    expect(defaultMix(0)).toEqual({});
    expect(defaultMix(-4)).toEqual({});
  });
});

describe('normalizeMix', () => {
  it('passes through a mix that already adds up', () => {
    expect(normalizeMix(5, { SINGLE: 2, MULTI: 1, TRUE_FALSE: 1, FILL_BLANK: 1 })).toEqual({
      SINGLE: 2,
      MULTI: 1,
      TRUE_FALSE: 1,
      FILL_BLANK: 1,
    });
  });

  it('falls back to the default when no mix was chosen', () => {
    expect(normalizeMix(3, undefined)).toEqual({ SINGLE: 3 });
    expect(normalizeMix(3, {})).toEqual({ SINGLE: 3 });
  });

  it('scales a mix that does not match the total, keeping the total', () => {
    const out = normalizeMix(5, { SINGLE: 6, MULTI: 4 });
    expect(mixTotal(out)).toBe(5);
    expect(out.SINGLE).toBeGreaterThan(out.MULTI || 0);
  });

  it('scales upwards too', () => {
    expect(mixTotal(normalizeMix(12, { SINGLE: 2, MULTI: 1 }))).toBe(12);
  });

  it('ignores negative and fractional entries', () => {
    const out = normalizeMix(4, { SINGLE: 4, MULTI: -2, TRUE_FALSE: 0.4 } as any);
    expect(mixTotal(out)).toBe(4);
    expect(out.MULTI).toBeUndefined();
  });

  it('asks for nothing when the total is nothing', () => {
    expect(normalizeMix(0, { SINGLE: 5 })).toEqual({});
  });

  it('never emits a type with a count of zero', () => {
    const out = normalizeMix(2, { SINGLE: 100, FILL_BLANK: 1 });
    expect(Object.values(out).every((n) => n > 0)).toBe(true);
    expect(mixTotal(out)).toBe(2);
  });
});

describe('mixToSlices', () => {
  it('splits each type into batches no bigger than the limit', () => {
    const slices = mixToSlices({ SINGLE: 7 }, 3);
    expect(slices).toEqual([
      { type: 'SINGLE', count: 3 },
      { type: 'SINGLE', count: 3 },
      { type: 'SINGLE', count: 1 },
    ]);
  });

  it('keeps every batch to a single type, which is what a model handles well', () => {
    const slices = mixToSlices({ SINGLE: 2, MULTI: 2 }, 3);
    expect(slices.every((s) => s.count > 0)).toBe(true);
    expect(new Set(slices.map((s) => s.type)).size).toBe(2);
  });

  it('writes the biggest group first, so an interrupted run is still usable', () => {
    const slices = mixToSlices({ FILL_BLANK: 1, SINGLE: 5 }, 10);
    expect(slices[0].type).toBe('SINGLE');
  });

  it('accounts for every question asked for', () => {
    const mix = { SINGLE: 5, MULTI: 3, TRUE_FALSE: 2, FILL_BLANK: 1 };
    const total = mixToSlices(mix, 3).reduce((n, s) => n + s.count, 0);
    expect(total).toBe(11);
  });

  it('produces nothing from an empty mix', () => {
    expect(mixToSlices({}, 3)).toEqual([]);
  });
});

describe('outstandingMix', () => {
  it('reports the shortfall when the model returned fewer than asked', () => {
    const owed = outstandingMix({ SINGLE: 5 }, [{ type: 'SINGLE' }, { type: 'SINGLE' }]);
    expect(owed).toEqual({ SINGLE: 3 });
  });

  it('reports nothing owed once the order is filled', () => {
    const owed = outstandingMix({ SINGLE: 2 }, [{ type: 'SINGLE' }, { type: 'SINGLE' }]);
    expect(owed).toEqual({});
  });

  it('does not treat an overshoot on one type as credit against another', () => {
    const owed = outstandingMix({ SINGLE: 1, MULTI: 1 }, [
      { type: 'SINGLE' },
      { type: 'SINGLE' },
      { type: 'SINGLE' },
    ]);
    expect(owed).toEqual({ MULTI: 1 });
  });
});

describe('describeMix', () => {
  it('reads as a sentence', () => {
    expect(describeMix({ SINGLE: 2, MULTI: 1 })).toBe('2 single choice and 1 multiple answers');
    expect(describeMix({ SINGLE: 3 })).toBe('3 single choice');
  });

  it('says so when there is nothing', () => {
    expect(describeMix({})).toBe('nothing');
  });
});
