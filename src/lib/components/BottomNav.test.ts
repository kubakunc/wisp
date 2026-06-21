import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import BottomNav from './BottomNav.svelte';

describe('BottomNav', () => {
  it('renders all four tabs', () => {
    render(BottomNav, { active: 'sounds', onTab: () => {} });
    expect(screen.getByText('Sounds')).toBeTruthy();
    expect(screen.getByText('Mixes')).toBeTruthy();
    expect(screen.getByText('Store')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('marks active tab with aria-current=page', () => {
    render(BottomNav, { active: 'mixes', onTab: () => {} });
    const activeBtn = screen.getByText('Mixes').closest('button');
    expect(activeBtn?.getAttribute('aria-current')).toBe('page');
  });

  it('does not set aria-current on inactive tabs', () => {
    render(BottomNav, { active: 'sounds', onTab: () => {} });
    const mixesBtn = screen.getByText('Mixes').closest('button');
    expect(mixesBtn?.getAttribute('aria-current')).toBeNull();
  });

  it('calls onTab with correct tab id when clicked', async () => {
    const onTab = vi.fn();
    render(BottomNav, { active: 'sounds', onTab });
    await fireEvent.click(screen.getByText('Store').closest('button')!);
    expect(onTab).toHaveBeenCalledWith('store');
  });

  it('calls onTab with sounds when Sounds clicked', async () => {
    const onTab = vi.fn();
    render(BottomNav, { active: 'mixes', onTab });
    await fireEvent.click(screen.getByText('Sounds').closest('button')!);
    expect(onTab).toHaveBeenCalledWith('sounds');
  });

  it('applies active class to active tab button', () => {
    render(BottomNav, { active: 'settings', onTab: () => {} });
    const settingsBtn = screen.getByText('Settings').closest('button');
    expect(settingsBtn?.classList.contains('active')).toBe(true);
  });

  it('renders nav element with label', () => {
    render(BottomNav, { active: 'sounds', onTab: () => {} });
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });
});
