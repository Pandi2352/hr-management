import { salvageJson } from './json-salvage.util';

describe('salvageJson', () => {
  it('parses well-formed JSON unchanged', () => {
    expect(salvageJson('{"a":1}')).toEqual({ a: 1 });
    expect(salvageJson('  [1, 2, 3]  ')).toEqual([1, 2, 3]);
  });

  it('recovers the complete elements of a truncated array', () => {
    const truncated = '{"questions":[{"prompt":"One","points":10},{"prompt":"Two","points":10},{"prompt":"Thr';
    expect(salvageJson<{ questions: unknown[] }>(truncated)?.questions).toHaveLength(2);
  });

  it('recovers a truncated object', () => {
    const truncated = '{"title":"Kafka","questions":[{"prompt":"One"}],"descri';
    const out = salvageJson<{ title: string; questions: unknown[] }>(truncated);
    expect(out?.title).toBe('Kafka');
    expect(out?.questions).toHaveLength(1);
  });

  it('survives braces and brackets inside the content', () => {
    const truncated =
      '{"questions":[{"prompt":"What does {\\"a\\": 1} mean?","options":["An object","A set"]},{"prompt":"Tru';
    const out = salvageJson<{ questions: { prompt: string }[] }>(truncated);
    expect(out?.questions).toHaveLength(1);
    expect(out?.questions[0].prompt).toContain('{"a": 1}');
  });

  it('survives an escaped quote at the truncation point', () => {
    const truncated = '{"questions":[{"prompt":"He said \\"yes\\""},{"prompt":"She said \\"n';
    expect(salvageJson<{ questions: unknown[] }>(truncated)?.questions).toHaveLength(1);
  });

  it('gives up rather than inventing content', () => {
    expect(salvageJson('')).toBeUndefined();
    expect(salvageJson('not json at all')).toBeUndefined();
    expect(salvageJson('{"a": ')).toBeUndefined();
  });

  it('does not confuse a parsed null with a failure', () => {
    expect(salvageJson('null')).toBeNull();
    expect(salvageJson('garbage')).toBeUndefined();
  });

  it('reports failure rather than an empty result when nothing completed', () => {
    // There is no element boundary to cut at, so there is nothing to recover.
    // Saying so is better than handing back an empty list that looks like the
    // model genuinely returned no questions.
    expect(salvageJson('{"questions":[{"prompt":"Only a frag')).toBeUndefined();
  });

  it('handles deep nesting left open at several levels', () => {
    const truncated = '{"a":{"b":{"c":[1,2,3],"d":{"e":"f"}},"g":[{"h":1},{"h":';
    const out = salvageJson<any>(truncated);
    expect(out?.a?.b?.c).toEqual([1, 2, 3]);
    expect(out?.a?.g).toHaveLength(1);
  });
});
