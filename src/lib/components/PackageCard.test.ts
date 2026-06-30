import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PackageCard from './PackageCard.svelte';
import type { PackageLite } from '$lib/adapters/purchases';

const annualPkg: PackageLite = {
  identifier: '$rc_annual',
  productId: 'wisp.premium.annual',
  priceString: '$39.99',
  packageType: 'ANNUAL'
};

const monthlyPkg: PackageLite = {
  identifier: '$rc_monthly',
  productId: 'wisp.premium.monthly',
  priceString: '$6.99',
  packageType: 'MONTHLY'
};

describe('PackageCard', () => {
  it('renders Annual label for annual package', () => {
    render(PackageCard, { pkg: annualPkg, featured: false, onSelect: () => {} });
    expect(screen.getByText('Annual')).toBeTruthy();
  });

  it('renders Monthly label for monthly package', () => {
    render(PackageCard, { pkg: monthlyPkg, featured: false, onSelect: () => {} });
    expect(screen.getByText('Monthly')).toBeTruthy();
  });

  it('shows price string', () => {
    render(PackageCard, { pkg: annualPkg, featured: false, onSelect: () => {} });
    expect(screen.getByText('$39.99')).toBeTruthy();
  });

  it('shows the savings in the badge for featured annual', () => {
    render(PackageCard, { pkg: annualPkg, featured: true, savingsPercent: 58, onSelect: () => {} });
    expect(screen.getByText('BEST VALUE · SAVE 58%')).toBeTruthy();
  });

  it('falls back to "BEST VALUE" when no savings is provided', () => {
    render(PackageCard, { pkg: annualPkg, featured: true, onSelect: () => {} });
    expect(screen.getByText('BEST VALUE')).toBeTruthy();
  });

  it('does not show badge for non-featured annual', () => {
    render(PackageCard, { pkg: annualPkg, featured: false, savingsPercent: 58, onSelect: () => {} });
    expect(screen.queryByText(/BEST VALUE/)).toBeFalsy();
  });

  it('does not show badge for monthly even if featured', () => {
    render(PackageCard, { pkg: monthlyPkg, featured: true, savingsPercent: 58, onSelect: () => {} });
    expect(screen.queryByText(/BEST VALUE/)).toBeFalsy();
  });

  it('shows "7-day free trial" for featured annual', () => {
    render(PackageCard, { pkg: annualPkg, featured: true, onSelect: () => {} });
    expect(screen.getByText('7-day free trial')).toBeTruthy();
  });

  it('shows per-month derived label for annual package', () => {
    render(PackageCard, { pkg: annualPkg, featured: true, onSelect: () => {} });
    // $39.99/12 ≈ $3.33/month
    expect(screen.getByText(/\$3\.33\/month/)).toBeTruthy();
  });

  it('does not show per-month label for monthly package', () => {
    render(PackageCard, { pkg: monthlyPkg, featured: false, onSelect: () => {} });
    expect(screen.queryByText(/\/month/)).toBeFalsy();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(PackageCard, { pkg: monthlyPkg, featured: false, onSelect });
    await fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('applies featured class when featured', () => {
    const { container } = render(PackageCard, { pkg: annualPkg, featured: true, onSelect: () => {} });
    expect(container.querySelector('.package-card.featured')).toBeTruthy();
  });

  it('does not apply featured class when not featured', () => {
    const { container } = render(PackageCard, { pkg: annualPkg, featured: false, onSelect: () => {} });
    expect(container.querySelector('.package-card.featured')).toBeFalsy();
  });

  it('shows "Cancel anytime" for monthly', () => {
    render(PackageCard, { pkg: monthlyPkg, featured: false, onSelect: () => {} });
    expect(screen.getByText('Cancel anytime')).toBeTruthy();
  });
});
