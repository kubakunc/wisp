import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TimerSheet from './TimerSheet.svelte';

const base = { open: true, onChoose: () => {}, onClose: () => {} } as const;

describe('TimerSheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(TimerSheet, { ...base, open: false });
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders the sheet when open', () => {
    render(TimerSheet, { ...base });
    expect(screen.getByRole('dialog', { name: 'Sleep timer' })).toBeTruthy();
  });

  it('renders all 6 chips: 15/30/45/60/90/Custom', () => {
    render(TimerSheet, { ...base });
    for (const m of ['15 min', '30 min', '45 min', '60 min', '90 min']) {
      expect(screen.getByRole('button', { name: m })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy();
  });

  it('tapping a preset starts it immediately (no separate confirm)', async () => {
    const onChoose = vi.fn();
    render(TimerSheet, { ...base, onChoose });
    await fireEvent.click(screen.getByRole('button', { name: '45 min' }));
    expect(onChoose).toHaveBeenCalledWith('preset', 45);
  });

  it('there is no global "Start timer" button before choosing custom', () => {
    render(TimerSheet, { ...base });
    expect(screen.queryByRole('button', { name: /Start timer/ })).toBeFalsy();
  });

  it('tapping "Until I stop it" chooses until immediately', async () => {
    const onChoose = vi.fn();
    render(TimerSheet, { ...base, onChoose });
    await fireEvent.click(screen.getByText('Until I stop it'));
    expect(onChoose).toHaveBeenCalledWith('until');
  });

  it('Custom reveals the stepper (does not start yet)', async () => {
    const onChoose = vi.fn();
    render(TimerSheet, { ...base, onChoose });
    await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByRole('spinbutton', { name: /custom timer duration/i })).toBeTruthy();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('custom confirm starts the chosen minutes', async () => {
    const onChoose = vi.fn();
    render(TimerSheet, { ...base, onChoose });
    await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    await fireEvent.click(screen.getByRole('button', { name: /Start timer · 20 min/ }));
    expect(onChoose).toHaveBeenCalledWith('custom', 20);
  });

  it('stepper − and + adjust the custom value before confirming', async () => {
    const onChoose = vi.fn();
    render(TimerSheet, { ...base, onChoose });
    await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    await fireEvent.click(screen.getByRole('button', { name: /decrease by 5/i })); // 20 → 15
    await fireEvent.click(screen.getByRole('button', { name: /Start timer · 15 min/ }));
    expect(onChoose).toHaveBeenCalledWith('custom', 15);
  });

  it('typing a custom value then confirming starts that value', async () => {
    const onChoose = vi.fn();
    render(TimerSheet, { ...base, onChoose });
    await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const input = screen.getByRole('spinbutton', { name: /custom timer duration/i });
    await fireEvent.input(input, { target: { valueAsNumber: 45 } });
    await fireEvent.click(screen.getByRole('button', { name: /Start timer · 45 min/ }));
    expect(onChoose).toHaveBeenCalledWith('custom', 45);
  });

  it('shows a "Turn off timer" button only when a timer is active', async () => {
    const onCancel = vi.fn();
    const { rerender } = render(TimerSheet, { ...base, active: false, onCancel });
    expect(screen.queryByRole('button', { name: 'Turn off timer' })).toBeFalsy();
    await rerender({ ...base, active: true, onCancel });
    await fireEvent.click(screen.getByRole('button', { name: 'Turn off timer' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onClose when scrim clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(TimerSheet, { ...base, onClose });
    await fireEvent.click(container.querySelector('.scrim') as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(TimerSheet, { ...base, onClose });
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows explainer text + heading', () => {
    render(TimerSheet, { ...base });
    expect(screen.getByText(/Sound fades out gently/)).toBeTruthy();
    expect(screen.getByText('Sleep timer')).toBeTruthy();
  });
});
