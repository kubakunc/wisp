import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TimerSheet from './TimerSheet.svelte';
import type { TimerState } from '$lib/types';

const offTimer: TimerState = { mode: 'off', durationSec: null, endsAt: null };
const activeTimer: TimerState = {
  mode: 'preset',
  durationSec: 30 * 60,
  endsAt: Date.now() + 30 * 60 * 1000
};

describe('TimerSheet', () => {
  it('renders all 5 preset buttons', () => {
    render(TimerSheet, { timerState: offTimer, onSetPreset: () => {}, onClear: () => {} });
    expect(screen.getByRole('button', { name: '15m' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '30m' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '45m' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '60m' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '90m' })).toBeTruthy();
  });

  it('calls onSetPreset with correct value', async () => {
    const onSetPreset = vi.fn();
    render(TimerSheet, { timerState: offTimer, onSetPreset, onClear: () => {} });
    await fireEvent.click(screen.getByRole('button', { name: '30m' }));
    expect(onSetPreset).toHaveBeenCalledWith(30);
  });

  it('does not show Cancel Timer when timer is off', () => {
    render(TimerSheet, { timerState: offTimer, onSetPreset: () => {}, onClear: () => {} });
    expect(screen.queryByText('Cancel Timer')).toBeFalsy();
  });

  it('shows Cancel Timer when timer is active', () => {
    render(TimerSheet, { timerState: activeTimer, onSetPreset: () => {}, onClear: () => {} });
    expect(screen.getByText('Cancel Timer')).toBeTruthy();
  });

  it('calls onClear when Cancel Timer is clicked', async () => {
    const onClear = vi.fn();
    render(TimerSheet, { timerState: activeTimer, onSetPreset: () => {}, onClear });
    await fireEvent.click(screen.getByText('Cancel Timer'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('has dialog role', () => {
    render(TimerSheet, { timerState: offTimer, onSetPreset: () => {}, onClear: () => {} });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows sleep timer heading', () => {
    render(TimerSheet, { timerState: offTimer, onSetPreset: () => {}, onClear: () => {} });
    expect(screen.getByText('Sleep Timer')).toBeTruthy();
  });

  it('preset button is aria-pressed true for active preset', () => {
    const timer: TimerState = { mode: 'preset', durationSec: 30 * 60, endsAt: null };
    render(TimerSheet, { timerState: timer, onSetPreset: () => {}, onClear: () => {} });
    const btn = screen.getByRole('button', { name: '30m' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });
});
