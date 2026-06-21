import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TimerSheet from './TimerSheet.svelte';

describe('TimerSheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(TimerSheet, {
      open: false, selected: null, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders the sheet when open', () => {
    render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByRole('dialog', { name: 'Sleep timer' })).toBeTruthy();
  });

  it('renders all 6 chips: 15/30/45/60/90/Custom', () => {
    render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByRole('button', { name: '15 min' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '30 min' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '45 min' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '60 min' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '90 min' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy();
  });

  it('picks a preset and starts', async () => {
    const onPick = vi.fn();
    const onStart = vi.fn();
    render(TimerSheet, {
      open: true, selected: 30, onPick, onStart, onClose: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: '45 min' }));
    expect(onPick).toHaveBeenCalledWith(45);
    await fireEvent.click(screen.getByRole('button', { name: /Start timer/ }));
    expect(onStart).toHaveBeenCalled();
  });

  it('calls onPick with "custom" when Custom chip clicked', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: null, onPick, onStart: () => {}, onClose: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(onPick).toHaveBeenCalledWith('custom');
  });

  it('calls onPick with "until" when Until row clicked', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: null, onPick, onStart: () => {}, onClose: () => {}
    });
    await fireEvent.click(screen.getByText('Until I stop it'));
    expect(onPick).toHaveBeenCalledWith('until');
  });

  it('calls onClose when scrim clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose
    });
    const scrim = container.querySelector('.scrim') as HTMLElement;
    await fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows explainer text', () => {
    render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByText(/Sound fades out gently/)).toBeTruthy();
  });

  it('selected chip has chip-selected class', () => {
    const { container } = render(TimerSheet, {
      open: true, selected: 30, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    const selectedChip = container.querySelector('.chip-selected');
    expect(selectedChip).toBeTruthy();
    expect(selectedChip?.textContent?.trim()).toBe('30');
  });

  it('CTA shows minutes when a number is selected', () => {
    render(TimerSheet, {
      open: true, selected: 45, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByRole('button', { name: 'Start timer · 45 min' })).toBeTruthy();
  });

  it('has dialog role', () => {
    render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows sleep timer heading', () => {
    render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByText('Sleep timer')).toBeTruthy();
  });

  it('calls onClose when Escape key is pressed on the dialog', async () => {
    const onClose = vi.fn();
    render(TimerSheet, {
      open: true, selected: null, onPick: () => {}, onStart: () => {}, onClose
    });
    const dialog = screen.getByRole('dialog');
    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Task 13 — Custom timer fixes
  it('Custom chip calls onPick with "custom"', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: null, onPick, onStart: () => {}, onClose: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(onPick).toHaveBeenCalledWith('custom');
  });

  it('Custom chip reveals the numeric stepper input', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: 'custom', onPick, onStart: () => {}, onClose: () => {}
    });
    // The stepper input should be visible when selected === 'custom'
    const input = screen.getByRole('spinbutton', { name: /custom timer duration/i });
    expect(input).toBeTruthy();
  });

  it('changing the custom input calls onPick with the numeric value', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: 'custom', onPick, onStart: () => {}, onClose: () => {}
    });
    const input = screen.getByRole('spinbutton', { name: /custom timer duration/i });
    await fireEvent.input(input, { target: { valueAsNumber: 45 } });
    expect(onPick).toHaveBeenCalledWith(45);
  });

  it('CTA shows the chosen custom minutes when a number is active from custom flow', () => {
    render(TimerSheet, {
      open: true, selected: 45, onPick: () => {}, onStart: () => {}, onClose: () => {}
    });
    expect(screen.getByRole('button', { name: 'Start timer · 45 min' })).toBeTruthy();
  });

  it('stepper − button calls onPick with decremented value', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: 'custom', onPick, onStart: () => {}, onClose: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: /decrease by 5/i }));
    // default is 20, -5 = 15
    expect(onPick).toHaveBeenCalledWith(15);
  });

  it('stepper + button calls onPick with incremented value', async () => {
    const onPick = vi.fn();
    render(TimerSheet, {
      open: true, selected: 'custom', onPick, onStart: () => {}, onClose: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: /increase by 5/i }));
    // default is 20, +5 = 25
    expect(onPick).toHaveBeenCalledWith(25);
  });
});
