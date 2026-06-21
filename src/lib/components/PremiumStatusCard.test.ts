import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PremiumStatusCard from './PremiumStatusCard.svelte';

describe('PremiumStatusCard', () => {
  it('shows "Free Plan" when not premium', () => {
    render(PremiumStatusCard, { isPremium: false, onUpgrade: () => {}, onRestore: () => {} });
    expect(screen.getByText('Free Plan')).toBeTruthy();
  });

  it('shows "Premium Active" when premium', () => {
    render(PremiumStatusCard, { isPremium: true, onUpgrade: () => {}, onRestore: () => {} });
    expect(screen.getByText('Premium Active')).toBeTruthy();
  });

  it('shows Upgrade button when not premium', () => {
    render(PremiumStatusCard, { isPremium: false, onUpgrade: () => {}, onRestore: () => {} });
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeTruthy();
  });

  it('does not show Upgrade button when premium', () => {
    render(PremiumStatusCard, { isPremium: true, onUpgrade: () => {}, onRestore: () => {} });
    expect(screen.queryByRole('button', { name: 'Upgrade' })).toBeFalsy();
  });

  it('calls onUpgrade when Upgrade button clicked', async () => {
    const onUpgrade = vi.fn();
    render(PremiumStatusCard, { isPremium: false, onUpgrade, onRestore: () => {} });
    await fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));
    expect(onUpgrade).toHaveBeenCalledOnce();
  });

  it('shows restore button for premium', () => {
    render(PremiumStatusCard, { isPremium: true, onUpgrade: () => {}, onRestore: () => {} });
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
  });

  it('shows restore purchase link for free', () => {
    render(PremiumStatusCard, { isPremium: false, onUpgrade: () => {}, onRestore: () => {} });
    expect(screen.getByRole('button', { name: 'Restore purchase' })).toBeTruthy();
  });

  it('calls onRestore when restore button clicked (premium)', async () => {
    const onRestore = vi.fn();
    render(PremiumStatusCard, { isPremium: true, onUpgrade: () => {}, onRestore });
    await fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('calls onRestore when restore purchase link clicked (free)', async () => {
    const onRestore = vi.fn();
    render(PremiumStatusCard, { isPremium: false, onUpgrade: () => {}, onRestore });
    await fireEvent.click(screen.getByRole('button', { name: 'Restore purchase' }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('applies is-premium class when premium', () => {
    const { container } = render(PremiumStatusCard, { isPremium: true, onUpgrade: () => {}, onRestore: () => {} });
    expect(container.querySelector('.premium-card.is-premium')).toBeTruthy();
  });

  it('does not apply is-premium class when not premium', () => {
    const { container } = render(PremiumStatusCard, { isPremium: false, onUpgrade: () => {}, onRestore: () => {} });
    expect(container.querySelector('.premium-card.is-premium')).toBeFalsy();
  });
});
