import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toggle from './Toggle.svelte';

describe('Toggle', () => {
  it('renders a button with role switch', () => {
    render(Toggle, { on: false, onToggle: () => {} });
    const btn = screen.getByRole('switch');
    expect(btn).toBeTruthy();
  });

  it('has aria-checked false when off', () => {
    render(Toggle, { on: false, onToggle: () => {} });
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });

  it('has aria-checked true when on', () => {
    render(Toggle, { on: true, onToggle: () => {} });
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('calls onToggle when clicked and not disabled', async () => {
    const onToggle = vi.fn();
    render(Toggle, { on: false, onToggle });
    await fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('does not call onToggle when disabled', async () => {
    const onToggle = vi.fn();
    render(Toggle, { on: false, disabled: true, onToggle });
    await fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('has disabled attribute when disabled prop is true', () => {
    render(Toggle, { on: false, disabled: true, onToggle: () => {} });
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
  });

  it('applies on class when on is true', () => {
    const { container } = render(Toggle, { on: true, onToggle: () => {} });
    expect(container.querySelector('.toggle.on')).toBeTruthy();
  });

  it('does not apply on class when on is false', () => {
    const { container } = render(Toggle, { on: false, onToggle: () => {} });
    expect(container.querySelector('.toggle.on')).toBeFalsy();
  });
});
