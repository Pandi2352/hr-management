import { normalizeCategory, reconcileCategory } from './quiz-category.util';

describe('normalizeCategory', () => {
  it('collapses messy whitespace', () => {
    expect(normalizeCategory('  Data   Privacy  ')).toBe('Data Privacy');
  });

  it('title-cases an unknown category', () => {
    expect(normalizeCategory('brand new topic')).toBe('Brand New Topic');
  });

  it('keeps small joining words lowercase inside a title', () => {
    expect(normalizeCategory('rules of the road')).toBe('Rules of the Road');
  });

  it('capitalises the first word even when it is a small word', () => {
    expect(normalizeCategory('the basics')).toBe('The Basics');
  });

  it('preserves an acronym rather than flattening it', () => {
    // "Gdpr Basics" would look like a typo in every filter that shows it.
    expect(normalizeCategory('GDPR Basics')).toBe('GDPR Basics');
  });

  it('returns empty for nothing', () => {
    expect(normalizeCategory('')).toBe('');
    expect(normalizeCategory(undefined)).toBe('');
    expect(normalizeCategory(null)).toBe('');
  });

  it('caps the length so one bad generation cannot stretch every filter', () => {
    expect(normalizeCategory('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });

  describe('aliases', () => {
    it.each([
      ['info sec', 'Information Security'],
      ['Info Security', 'Information Security'],
      ['information security', 'Information Security'],
      ['cyber security', 'Information Security'],
      ['security', 'Information Security'],
      ['compliance', 'Compliance & Safety'],
      ['compliance and safety', 'Compliance & Safety'],
      ['safety', 'Compliance & Safety'],
      ['data protection', 'Data Privacy'],
      ['HR', 'People Operations'],
      ['people ops', 'People Operations'],
      ['leadership', 'Leadership & Culture'],
      ['tech', 'Product & Technology'],
      ['customer service', 'Customer Experience'],
      ['general knowledge', 'General'],
    ])('maps %s to %s', (input, expected) => {
      expect(normalizeCategory(input)).toBe(expected);
    });
  });
});

describe('reconcileCategory', () => {
  const existing = ['Information Security', 'Compliance & Safety', 'Customer Experience'];

  it('returns the existing spelling for a case-only difference', () => {
    expect(reconcileCategory('information security', existing)).toBe('Information Security');
  });

  it('returns the existing spelling when punctuation differs', () => {
    // "and" versus "&" is the single most common way this list fragments.
    expect(reconcileCategory('Compliance and Safety', existing)).toBe('Compliance & Safety');
  });

  it('resolves an abbreviation onto the existing entry', () => {
    expect(reconcileCategory('Info Sec', existing)).toBe('Information Security');
  });

  it('creates a normalised new category when nothing matches', () => {
    expect(reconcileCategory('workplace ergonomics', existing)).toBe('Workplace Ergonomics');
  });

  it('falls back to General for an empty proposal', () => {
    // An empty proposal is the "let the agent choose" path arriving with
    // nothing; a quiz still has to land somewhere.
    expect(reconcileCategory('', existing)).toBe('General');
    expect(reconcileCategory('   ', existing)).toBe('General');
  });

  it('works against an empty organization', () => {
    expect(reconcileCategory('information security', [])).toBe('Information Security');
  });

  it('does not merge two genuinely different categories', () => {
    expect(reconcileCategory('Customer Retention', existing)).toBe('Customer Retention');
  });

  it('is stable: reconciling its own output changes nothing', () => {
    // Re-saving a quiz must not walk its category to a new spelling each time.
    const once = reconcileCategory('info sec', existing);
    expect(reconcileCategory(once, existing)).toBe(once);
  });
});
