import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { modalOpen } from './ui';

describe('ui modalOpen store', () => {
  it('defaults to false', () => {
    modalOpen.set(false);
    expect(get(modalOpen)).toBe(false);
  });

  it('can be toggled true/false', () => {
    modalOpen.set(true);
    expect(get(modalOpen)).toBe(true);
    modalOpen.set(false);
    expect(get(modalOpen)).toBe(false);
  });
});
