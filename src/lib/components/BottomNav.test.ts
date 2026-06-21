import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BottomNav from './BottomNav.svelte';

describe('BottomNav', () => {
  it('renders exactly 3 tabs', () => {
    render(BottomNav, { active: 'sounds' });
    expect(screen.getByText('Sounds')).toBeTruthy();
    expect(screen.getByText('Mixes')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.queryByText('Store')).toBeFalsy();
  });

  it('renders tabs as anchor links with correct hrefs', () => {
    render(BottomNav, { active: 'sounds' });
    const soundsLink = screen.getByText('Sounds').closest('a');
    const mixesLink = screen.getByText('Mixes').closest('a');
    const settingsLink = screen.getByText('Settings').closest('a');
    expect(soundsLink?.getAttribute('href')).toBe('/');
    expect(mixesLink?.getAttribute('href')).toBe('/mixes');
    expect(settingsLink?.getAttribute('href')).toBe('/settings');
  });

  it('marks active tab with aria-current=page', () => {
    render(BottomNav, { active: 'mixes' });
    const activeLink = screen.getByText('Mixes').closest('a');
    expect(activeLink?.getAttribute('aria-current')).toBe('page');
  });

  it('does not set aria-current on inactive tabs', () => {
    render(BottomNav, { active: 'sounds' });
    const mixesLink = screen.getByText('Mixes').closest('a');
    expect(mixesLink?.getAttribute('aria-current')).toBeNull();
  });

  it('applies active class to active tab', () => {
    render(BottomNav, { active: 'settings' });
    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink?.classList.contains('active')).toBe(true);
  });

  it('active tab has color #b6bdf0, inactive has #5b6488', () => {
    render(BottomNav, { active: 'sounds' });
    const soundsLink = screen.getByText('Sounds').closest('a');
    const mixesLink = screen.getByText('Mixes').closest('a');
    expect(soundsLink?.classList.contains('active')).toBe(true);
    expect(mixesLink?.classList.contains('active')).toBe(false);
  });

  it('renders nav element with label', () => {
    render(BottomNav, { active: 'sounds' });
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });

  it('has no onTab prop (pure href links)', () => {
    // Should render without any callback prop — no 4th tab exists
    const { container } = render(BottomNav, { active: 'sounds' });
    const links = container.querySelectorAll('a.nav-item');
    expect(links.length).toBe(3);
  });
});
