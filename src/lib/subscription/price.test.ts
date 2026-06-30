import { describe, it, expect } from 'vitest';
import { parsePriceNumber, annualSavingsPercent } from './price';

describe('parsePriceNumber', () => {
  it('parses a leading-symbol price', () => {
    expect(parsePriceNumber('$34.99')).toBe(34.99);
  });

  it('parses a trailing-symbol comma-decimal price (EU)', () => {
    expect(parsePriceNumber('34,99 €')).toBe(34.99);
  });

  it('parses other currency symbols', () => {
    expect(parsePriceNumber('£6.99')).toBe(6.99);
  });

  it('returns null when there is no number', () => {
    expect(parsePriceNumber('Free')).toBeNull();
  });
});

describe('annualSavingsPercent', () => {
  it('computes the saving for $6.99/mo vs $34.99/yr', () => {
    // 6.99 * 12 = 83.88; 1 - 34.99/83.88 = 0.583 -> 58%
    expect(annualSavingsPercent('$6.99', '$34.99')).toBe(58);
  });

  it('computes the saving for $9.99/mo vs $39.99/yr', () => {
    // 9.99 * 12 = 119.88; 1 - 39.99/119.88 = 0.666 -> 67%
    expect(annualSavingsPercent('$9.99', '$39.99')).toBe(67);
  });

  it('works regardless of currency as long as both match', () => {
    expect(annualSavingsPercent('6,99 €', '34,99 €')).toBe(58);
  });

  it('returns null when the annual plan is not cheaper', () => {
    expect(annualSavingsPercent('$6.99', '$83.88')).toBeNull();
    expect(annualSavingsPercent('$6.99', '$100.00')).toBeNull();
  });

  it('returns null when a price cannot be parsed', () => {
    expect(annualSavingsPercent('n/a', '$34.99')).toBeNull();
    expect(annualSavingsPercent('$6.99', 'n/a')).toBeNull();
  });

  it('returns null when monthly price is zero', () => {
    expect(annualSavingsPercent('$0.00', '$34.99')).toBeNull();
  });
});
