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

  it('border-radius matches the icon tile (size * 0.225)', () => {
    const { container } = render(WispMark, { size: 40 });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.borderRadius).toBe('9px'); // 40 * 0.225
  });

  it('border-radius scales proportionally for large size', () => {
    const { container } = render(WispMark, { size: 200 });
    const el = container.querySelector('.wisp-mark') as HTMLElement;
    expect(el.style.borderRadius).toBe('45px'); // 200 * 0.225
  });

  it('renders the night-sky gradient background + moon gradient defs', () => {
    const { container } = render(WispMark, { size: 64 });
    expect(container.querySelector('radialGradient')).toBeTruthy();
    expect(container.querySelector('linearGradient')).toBeTruthy();
  });

  it('is aria-hidden', () => {
    const { container } = render(WispMark);
    const el = container.querySelector('.wisp-mark');
    expect(el?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the crescent-moon SVG path inside', () => {
    const { container } = render(WispMark);
    const paths = [...container.querySelectorAll('svg path')].map((p) => p.getAttribute('d') ?? '');
    expect(paths.some((d) => d.includes('M21 12.79'))).toBe(true);
  });
});
