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
  it('renders the mix name', () => {
    render(MixCard, { mix, active: false, onPlay: () => {} });
    expect(screen.getByText('Rain & Ocean')).toBeTruthy();
  });

  it('shows layer count', () => {
    render(MixCard, { mix, active: false, onPlay: () => {} });
    expect(screen.getByText('2 sounds')).toBeTruthy();
  });

  it('shows singular "1 sound" for single layer', () => {
    const singleMix: Mix = { id: 'm', name: 'Solo', layers: [{ soundId: 'rain', volume: 1 }] };
    render(MixCard, { mix: singleMix, active: false, onPlay: () => {} });
    expect(screen.getByText('1 sound')).toBeTruthy();
  });

  it('calls onPlay when card body clicked', async () => {
    const onPlay = vi.fn();
    render(MixCard, { mix, active: false, onPlay });
    await fireEvent.click(screen.getByRole('button', { name: /Rain & Ocean/ }));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('card button is aria-pressed true when active', () => {
    render(MixCard, { mix, active: true, onPlay: () => {} });
    const btn = screen.getByRole('button', { name: /Rain & Ocean/ });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('card button is aria-pressed false when inactive', () => {
    render(MixCard, { mix, active: false, onPlay: () => {} });
    const btn = screen.getByRole('button', { name: /Rain & Ocean/ });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders delete button when onDelete provided', () => {
    render(MixCard, { mix, active: false, onPlay: () => {}, onDelete: () => {} });
    expect(screen.getByRole('button', { name: 'Delete Rain & Ocean' })).toBeTruthy();
  });

  it('does not render delete button when onDelete not provided', () => {
    render(MixCard, { mix, active: false, onPlay: () => {} });
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeFalsy();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(MixCard, { mix, active: false, onPlay: () => {}, onDelete });
    await fireEvent.click(screen.getByRole('button', { name: 'Delete Rain & Ocean' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('shows overflow count when more than 3 layers', () => {
    render(MixCard, { mix: bigMix, active: false, onPlay: () => {} });
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
