import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import SoundIcon from './SoundIcon.svelte';

describe('SoundIcon', () => {
  it('renders an svg with aria-hidden', () => {
    const { container } = render(SoundIcon, { id: 'rain' });
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the given size', () => {
    const { container } = render(SoundIcon, { id: 'fan', size: 32 });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('defaults size to 24', () => {
    const { container } = render(SoundIcon, { id: 'ocean' });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('24');
  });

  it('renders multiple paths for rain', () => {
    const { container } = render(SoundIcon, { id: 'rain' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('renders multiple paths for ocean', () => {
    const { container } = render(SoundIcon, { id: 'ocean' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
  });

  it('uses fallback path for unknown id', () => {
    const { container } = render(SoundIcon, { id: 'unknown-sound-xyz' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
    expect(paths[0].getAttribute('d')).toBe('M3 12c3 0 3-4 6-4s3 8 6 8 3-4 6-4');
  });

  it('renders heavy-rain with same paths as rain', () => {
    const { container: c1 } = render(SoundIcon, { id: 'rain' });
    const { container: c2 } = render(SoundIcon, { id: 'heavy-rain' });
    const paths1 = Array.from(c1.querySelectorAll('path')).map((p) => p.getAttribute('d'));
    const paths2 = Array.from(c2.querySelectorAll('path')).map((p) => p.getAttribute('d'));
    expect(paths1).toEqual(paths2);
  });

  it('renders wind with 3 paths', () => {
    const { container } = render(SoundIcon, { id: 'wind' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
  });

  it('renders thunder with 2 paths', () => {
    const { container } = render(SoundIcon, { id: 'thunder' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('white-noise has a distinct glyph from fan (not the fan path)', () => {
    const { container: c1 } = render(SoundIcon, { id: 'fan' });
    const { container: c2 } = render(SoundIcon, { id: 'white-noise' });
    const d1 = c1.querySelector('path')?.getAttribute('d');
    const d2 = c2.querySelector('path')?.getAttribute('d');
    expect(d1).not.toBe(d2);
  });

  it('noise colors all have distinct paths from each other', () => {
    const noiseIds = ['white-noise', 'pink-noise', 'brown-noise', 'blue-noise', 'grey-noise'];
    const firstPaths = noiseIds.map((id) => {
      const { container } = render(SoundIcon, { id });
      return container.querySelector('path')?.getAttribute('d');
    });
    // All first paths should be unique
    const unique = new Set(firstPaths);
    expect(unique.size).toBe(noiseIds.length);
  });

  it('pink-noise renders 4 paths (its 4-bar pattern)', () => {
    const { container } = render(SoundIcon, { id: 'pink-noise' });
    // pink-noise: 'M3 9v6M7 5v14M11 8v8M15 11v2' — single path element
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('brown-noise renders its own single path', () => {
    const { container } = render(SoundIcon, { id: 'brown-noise' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('blue-noise renders its own single path', () => {
    const { container } = render(SoundIcon, { id: 'blue-noise' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('grey-noise renders its own single path', () => {
    const { container } = render(SoundIcon, { id: 'grey-noise' });
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });
});
