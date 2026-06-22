import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MixCard from './MixCard.svelte';
import type { Mix } from '$lib/types';

const mix: Mix = {
  id: 'mix-1',
  name: 'Rain & Ocean',
  layers: [
    { soundId: 'rain', volume: 0.7 },
    { soundId: 'ocean', volume: 0.5 }
  ]
};

const bigMix: Mix = {
  id: 'mix-2',
  name: 'Big Mix',
  layers: [
    { soundId: 'rain', volume: 0.8 },
    { soundId: 'ocean', volume: 0.5 },
    { soundId: 'fan', volume: 0.3 },
    { soundId: 'forest', volume: 0.4 },
    { soundId: 'wind', volume: 0.2 }
  ]
};

describe('MixCard', () => {
  it('renders the mixed sound names as the title (not the stored name)', () => {
    render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByText('Rain, Ocean')).toBeTruthy();
    expect(screen.queryByText('Rain & Ocean')).toBeFalsy();
  });

  it('shows the sound count as subtitle', () => {
    render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByText('2 sounds')).toBeTruthy();
  });

  it('counts all layers for a larger mix', () => {
    render(MixCard, { mix: bigMix, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByText('5 sounds')).toBeTruthy();
  });

  it('uses "1 sound" (singular) for a single-layer mix', () => {
    const single: Mix = { id: 'm', name: 'x', layers: [{ soundId: 'rain', volume: 0.5 }] };
    render(MixCard, { mix: single, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByText('1 sound')).toBeTruthy();
  });

  it('calls onPlay when play button clicked', async () => {
    const onPlay = vi.fn();
    render(MixCard, { mix, playing: false, onPlay, onDelete: () => {} });
    await fireEvent.click(screen.getByRole('button', { name: /Play Rain, Ocean/ }));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('play button is aria-pressed true when playing', () => {
    render(MixCard, { mix, playing: true, onPlay: () => {}, onDelete: () => {} });
    const btn = screen.getByRole('button', { name: 'Pause Rain, Ocean' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('play button is aria-pressed false when not playing', () => {
    render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete: () => {} });
    const btn = screen.getByRole('button', { name: 'Play Rain, Ocean' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows PLAYING label when playing', () => {
    render(MixCard, { mix, playing: true, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByText('PLAYING')).toBeTruthy();
  });

  it('does not show PLAYING label when not playing', () => {
    render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.queryByText('PLAYING')).toBeFalsy();
  });

  it('shows equalizer bars when playing', () => {
    const { container } = render(MixCard, { mix, playing: true, onPlay: () => {}, onDelete: () => {} });
    const bars = container.querySelectorAll('.bar');
    expect(bars.length).toBe(3);
  });

  it('renders delete button', () => {
    render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByRole('button', { name: 'Delete mix: Rain, Ocean' })).toBeTruthy();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete });
    await fireEvent.click(screen.getByRole('button', { name: 'Delete mix: Rain, Ocean' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('applies playing class when playing', () => {
    const { container } = render(MixCard, { mix, playing: true, onPlay: () => {}, onDelete: () => {} });
    expect(container.querySelector('.mix-card.playing')).toBeTruthy();
  });

  it('does not apply playing class when not playing', () => {
    const { container } = render(MixCard, { mix, playing: false, onPlay: () => {}, onDelete: () => {} });
    expect(container.querySelector('.mix-card.playing')).toBeFalsy();
  });
});
