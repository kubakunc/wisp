import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SoundRow from './SoundRow.svelte';
import type { SoundDef } from '$lib/types';

const mockSound: SoundDef = {
  id: 'rain',
  name: 'Rain',
  category: 'nature',
  tier: 'free',
  assetPath: 'sounds/rain.mp3',
  bundled: false,
  file: 'rain.mp3'
};

const premiumSound: SoundDef = {
  id: 'thunder',
  name: 'Thunderstorm',
  category: 'nature',
  tier: 'premium',
  assetPath: 'sounds/thunder.mp3',
  bundled: false,
  file: 'thunder.mp3'
};

describe('SoundRow', () => {
  it('renders the sound name', () => {
    render(SoundRow, { sound: mockSound, active: false, locked: false, onPrimary: () => {} });
    expect(screen.getByText('Rain')).toBeTruthy();
  });

  it('shows Premium label when locked', () => {
    render(SoundRow, { sound: premiumSound, active: false, locked: true, onPrimary: () => {} });
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('shows volume percentage when active and not locked', () => {
    render(SoundRow, { sound: mockSound, active: true, volume: 0.75, locked: false, onPrimary: () => {} });
    expect(screen.getByText('On · 75%')).toBeTruthy();
  });

  it('does not show active label when inactive', () => {
    render(SoundRow, { sound: mockSound, active: false, volume: 0.5, locked: false, onPrimary: () => {} });
    expect(screen.queryByText(/On ·/)).toBeFalsy();
  });

  it('calls onPrimary when row button is clicked', async () => {
    const onPrimary = vi.fn();
    render(SoundRow, { sound: mockSound, active: false, locked: false, onPrimary });
    await fireEvent.click(screen.getByRole('button', { name: /Rain/i }));
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it('renders lock chip for locked sounds', () => {
    render(SoundRow, { sound: premiumSound, active: false, locked: true, onPrimary: () => {} });
    expect(screen.getByRole('button', { name: 'Locked — Premium' })).toBeTruthy();
  });

  it('renders a toggle switch for unlocked sounds', () => {
    render(SoundRow, { sound: mockSound, active: false, locked: false, onPrimary: () => {} });
    expect(screen.getByRole('switch')).toBeTruthy();
  });

  it('toggle is checked when active', () => {
    render(SoundRow, { sound: mockSound, active: true, locked: false, onPrimary: () => {} });
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('shows 0% when volume is 0 and active', () => {
    render(SoundRow, { sound: mockSound, active: true, volume: 0, locked: false, onPrimary: () => {} });
    expect(screen.getByText('On · 0%')).toBeTruthy();
  });

  it('shows 100% when volume is 1 and active', () => {
    render(SoundRow, { sound: mockSound, active: true, volume: 1, locked: false, onPrimary: () => {} });
    expect(screen.getByText('On · 100%')).toBeTruthy();
  });

  it('shows a progress ring while downloading', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
      active: false, locked: false, downloading: true, progress: 0.5, onPrimary: () => {}
    });
    expect(container.querySelector('.dl-ring')).toBeTruthy();
  });

  it('no ring when not downloading', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
      active: false, locked: false, downloading: false, progress: 0, onPrimary: () => {}
    });
    expect(container.querySelector('.dl-ring')).toBeFalsy();
  });

  it('shows a download-failed message with a retry hint on error', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
      active: false, locked: false, downloading: false, progress: 0, error: true, onPrimary: () => {}
    });
    expect(screen.getByText(/Couldn.t download/i)).toBeTruthy();
    expect(container.querySelector('.dl-error-badge')).toBeTruthy();
  });

  it('shows a "Tap to download" hint + cloud badge for a not-yet-downloaded sound', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
      active: false, locked: false, needsDownload: true, onPrimary: () => {}
    });
    expect(screen.getByText('Tap to download')).toBeTruthy();
    expect(container.querySelector('.dl-cloud')).toBeTruthy();
  });

  it('no download hint for a local (bundled/cached) sound', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'whitenoise', name: 'White Noise', category: 'noise', tier: 'free', assetPath: 'sounds/wn.wav', file: 'wn.wav', bundled: true },
      active: false, locked: false, needsDownload: false, onPrimary: () => {}
    });
    expect(screen.queryByText('Tap to download')).toBeFalsy();
    expect(container.querySelector('.dl-cloud')).toBeFalsy();
  });

  it('shows a "Free this week" badge + gold class when featured', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'thunder', name: 'Thunder', category: 'nature', tier: 'premium', assetPath: 'sounds/thunder.wav', file: 'thunder.wav', bundled: false },
      active: false, locked: false, featured: true, onPrimary: () => {}
    });
    expect(screen.getByText(/Free this week/i)).toBeTruthy();
    expect(container.querySelector('.sound-row.featured')).toBeTruthy();
  });

  it('no featured badge when not featured', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'thunder', name: 'Thunder', category: 'nature', tier: 'premium', assetPath: 'sounds/thunder.wav', file: 'thunder.wav', bundled: false },
      active: false, locked: true, onPrimary: () => {}
    });
    expect(screen.queryByText(/Free this week/i)).toBeFalsy();
    expect(container.querySelector('.sound-row.featured')).toBeFalsy();
  });

  it('downloading state takes precedence over a prior error (retry in progress)', () => {
    const { container } = render(SoundRow, {
      sound: { id: 'rain', name: 'Rain', category: 'nature', tier: 'free', assetPath: 'sounds/rain.wav', file: 'rain.wav', bundled: false },
      active: false, locked: false, downloading: true, progress: 0.3, error: true, onPrimary: () => {}
    });
    expect(container.querySelector('.dl-ring')).toBeTruthy();
    expect(container.querySelector('.dl-error-badge')).toBeFalsy();
  });
});
