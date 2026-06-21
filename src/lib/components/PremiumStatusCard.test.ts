import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PremiumStatusCard from './PremiumStatusCard.svelte';

describe('PremiumStatusCard', () => {
  it('shows "Premium" when premium', () => {
    render(PremiumStatusCard, { premium: true });
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('shows "Free — upgrade" when not premium', () => {
    render(PremiumStatusCard, { premium: false });
    expect(screen.getByText('Free — upgrade')).toBeTruthy();
  });

  it('shows premium subtitle when premium', () => {
    render(PremiumStatusCard, { premium: true });
    expect(screen.getByText('Enjoy all sounds & features')).toBeTruthy();
  });

  it('shows upgrade subtitle when not premium', () => {
    render(PremiumStatusCard, { premium: false });
    expect(screen.getByText('Unlock 30+ premium sounds')).toBeTruthy();
  });

  it('applies is-premium class when premium', () => {
    const { container } = render(PremiumStatusCard, { premium: true });
    expect(container.querySelector('.premium-card.is-premium')).toBeTruthy();
  });

  it('does not apply is-premium class when not premium', () => {
    const { container } = render(PremiumStatusCard, { premium: false });
    expect(container.querySelector('.premium-card.is-premium')).toBeFalsy();
  });

  it('renders no action buttons (presentational only)', () => {
    render(PremiumStatusCard, { premium: true });
    expect(screen.queryByRole('button')).toBeFalsy();
  });

  it('renders no action buttons when free either', () => {
    render(PremiumStatusCard, { premium: false });
    expect(screen.queryByRole('button')).toBeFalsy();
  });

  it('renders the WispMark component', () => {
    const { container } = render(PremiumStatusCard, { premium: true });
    // WispMark renders a .wisp-mark div
    expect(container.querySelector('.wisp-mark')).toBeTruthy();
  });

  it('does not render "Upgrade" or "Restore" buttons (parent owns those)', () => {
    render(PremiumStatusCard, { premium: false });
    expect(screen.queryByText(/Upgrade/)).toBeFalsy();
    expect(screen.queryByText(/Restore/)).toBeFalsy();
  });
});
