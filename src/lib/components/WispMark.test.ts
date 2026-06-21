import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WispMark from './WispMark.svelte';

describe('WispMark', () => {
  it('renders with default props', () => {
    const { container } = render(WispMark);
    const el = container.querySelector('.wisp-mark');
    expect(el).toBeTruthy();
  });

  it('applies the given size as width and height', () => {
    const { container } = render(WispMark, { size: 60 });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.width).toBe('60px');
    expect(el.style.height).toBe('60px');
  });

  it('border-radius is proportional to size (size * 0.3)', () => {
    const { container } = render(WispMark, { size: 40 });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.borderRadius).toBe('12px'); // 40 * 0.3
  });

  it('border-radius scales proportionally for large size', () => {
    const { container } = render(WispMark, { size: 100 });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.borderRadius).toBe('30px'); // 100 * 0.3
  });

  it('gradient=true: style contains var(--accent-grad)', () => {
    const { container } = render(WispMark, { gradient: true });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.background).toContain('var(--accent-grad)');
  });

  it('gradient=false: style contains var(--accent-1) not accent-grad', () => {
    const { container } = render(WispMark, { gradient: false });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.background).toContain('var(--accent-1)');
    expect(el.style.background).not.toContain('var(--accent-grad)');
  });

  it('is aria-hidden', () => {
    const { container } = render(WispMark);
    const el = container.querySelector('.wisp-mark');
    expect(el?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the wisp SVG path inside', () => {
    const { container } = render(WispMark);
    const path = container.querySelector('svg path');
    expect(path?.getAttribute('d')).toContain('M3 12');
  });
});
