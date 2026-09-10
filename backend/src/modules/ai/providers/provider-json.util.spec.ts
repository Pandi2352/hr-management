import { extractJsonObject, stripReasoning } from './provider-json.util';

describe('extractJsonObject', () => {
  it('parses a bare JSON object', () => {
    expect(extractJsonObject('{"score":72}')).toEqual({ score: 72 });
  });

  it('parses JSON wrapped in a fenced code block', () => {
    const raw = '```json\n{"score":81,"recommendation":"SHORTLIST"}\n```';
    expect(extractJsonObject(raw)).toEqual({ score: 81, recommendation: 'SHORTLIST' });
  });

  it('parses JSON preceded by prose', () => {
    const raw = 'Sure! Here is the assessment:\n\n{"score":40,"summary":"Thin on depth."}';
    expect(extractJsonObject(raw)).toEqual({ score: 40, summary: 'Thin on depth.' });
  });

  it('stops at the end of the object and ignores trailing prose', () => {
    // The greedy `\{[\s\S]*\}` this replaced would swallow the closing brace of
    // the trailing sentence and fail to parse.
    const raw = '{"score":55} Hope that helps! {not json}';
    expect(extractJsonObject(raw)).toEqual({ score: 55 });
  });

  it('keeps nested objects intact', () => {
    const raw = '{"score":90,"meta":{"model":"gpt-oss:120b","nested":{"deep":true}}}';
    expect(extractJsonObject(raw)).toEqual({
      score: 90,
      meta: { model: 'gpt-oss:120b', nested: { deep: true } },
    });
  });

  it('is not fooled by a closing brace inside a string value', () => {
    const raw = '{"summary":"Uses } and { in prose","score":10}';
    expect(extractJsonObject(raw)).toEqual({ summary: 'Uses } and { in prose', score: 10 });
  });

  it('is not fooled by an escaped quote inside a string value', () => {
    const raw = '{"summary":"They said \\"ship it\\" often","score":11}';
    expect(extractJsonObject(raw)).toEqual({ summary: 'They said "ship it" often', score: 11 });
  });

  it('returns null for prose with no object', () => {
    expect(extractJsonObject('I cannot help with that.')).toBeNull();
  });

  it('returns null for an unterminated object', () => {
    expect(extractJsonObject('{"score": 5')).toBeNull();
  });

  it('returns null for a balanced but invalid object', () => {
    expect(extractJsonObject('{"score": 5,}')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(extractJsonObject('')).toBeNull();
  });
});

describe('stripReasoning', () => {
  it('removes a think block and keeps the answer', () => {
    const raw = '<think>Let me weigh the options.</think>\nYou have 12 days left.';
    expect(stripReasoning(raw)).toBe('You have 12 days left.');
  });

  it('removes a multi-line thinking block', () => {
    const raw = '<thinking>\nline one\nline two\n</thinking>The answer.';
    expect(stripReasoning(raw)).toBe('The answer.');
  });

  it('leaves ordinary text untouched', () => {
    expect(stripReasoning('Just the answer.')).toBe('Just the answer.');
  });
});
