import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PackageCard from './PackageCard.svelte';
import type { PackageLite } from '$lib/adapters/purchases';

const annualPkg: PackageLite = {
  identifier: '$rc_annual',
  productId: 'wisp.premium.annual',
  priceString: '$29.99',
  packageType: 'ANNUAL'
};

const monthlyPkg: PackageLite = {
  identifier: '$rc_monthly',
  productId: 'wisp.premium.monthly',
  priceString: '$4.99',
  packageType: 'MONTHLY'
};

describe('PackageCard', () => {
  it('renders Annual label for annual package', () => {
    render(PackageCard, { pkg: annualPkg, selected: false, onSelect: () => {} });
    expect(screen.getByText('Annual')).toBeTruthy();
  });

  it('renders Monthly label for monthly package', () => {
    render(PackageCard, { pkg: monthlyPkg, selected: false, onSelect: () => {} });
    expect(screen.getByText('Monthly')).toBeTruthy();
  });

  it('shows price string', () => {
    render(PackageCard, { pkg: annualPkg, selected: false, onSelect: () => {} });
    expect(screen.getByText('$29.99')).toBeTruthy();
  });

  it('shows "Best Value" badge for annual', () => {
    render(PackageCard, { pkg: annualPkg, selected: false, onSelect: () => {} });
    expect(screen.getByText('Best Value')).toBeTruthy();
  });

  it('does not show "Best Value" badge for monthly', () => {
    render(PackageCard, { pkg: monthlyPkg, selected: false, onSelect: () => {} });
    expect(screen.queryByText('Best Value')).toBeFalsy();
  });

  it('has aria-pressed true when selected', () => {
    render(PackageCard, { pkg: annualPkg, selected: true, onSelect: () => {} });
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('has aria-pressed false when not selected', () => {
    render(PackageCard, { pkg: monthlyPkg, selected: false, onSelect: () => {} });
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(PackageCard, { pkg: monthlyPkg, selected: false, onSelect });
    await fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows per-year billing note for annual', () => {
    render(PackageCard, { pkg: annualPkg, selected: false, onSelect: () => {} });
    expect(screen.getByText('Billed once a year')).toBeTruthy();
  });

  it('shows monthly billing note for monthly', () => {
    render(PackageCard, { pkg: monthlyPkg, selected: false, onSelect: () => {} });
    expect(screen.getByText('Billed monthly, cancel anytime')).toBeTruthy();
  });

  it('applies selected class when selected', () => {
    const { container } = render(PackageCard, { pkg: annualPkg, selected: true, onSelect: () => {} });
    expect(container.querySelector('.package-card.selected')).toBeTruthy();
  });
});
