import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import VolumeSlider from './VolumeSlider.svelte';

describe('VolumeSlider', () => {
  it('renders a range input', () => {
    const { container } = render(VolumeSlider, { volume: 0.5, onVolume: () => {} });
    const input = container.querySelector('input[type="range"]');
    expect(input).toBeTruthy();
  });

  it('range input has min 0, max 1, step 0.01', () => {
    const { container } = render(VolumeSlider, { volume: 0.5, onVolume: () => {} });
    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.min).toBe('0');
    expect(input.max).toBe('1');
    expect(input.step).toBe('0.01');
  });

  it('sets value from volume prop', () => {
    const { container } = render(VolumeSlider, { volume: 0.75, onVolume: () => {} });
    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(parseFloat(input.value)).toBeCloseTo(0.75);
  });

  it('displays formatted percentage', () => {
    render(VolumeSlider, { volume: 0.6, onVolume: () => {} });
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('uses default label "Volume"', () => {
    const { container } = render(VolumeSlider, { volume: 0.5, onVolume: () => {} });
    const input = container.querySelector('input[type="range"]');
    expect(input?.getAttribute('aria-label')).toBe('Volume');
  });

  it('uses custom label when provided', () => {
    const { container } = render(VolumeSlider, { volume: 0.5, label: 'Rain Volume', onVolume: () => {} });
    const input = container.querySelector('input[type="range"]');
    expect(input?.getAttribute('aria-label')).toBe('Rain Volume');
  });

  it('calls onVolume with parsed float on input event', async () => {
    const onVolume = vi.fn();
    const { container } = render(VolumeSlider, { volume: 0.5, onVolume });
    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '0.8' } });
    expect(onVolume).toHaveBeenCalledWith(0.8);
  });

  it('shows 0% for volume 0', () => {
    render(VolumeSlider, { volume: 0, onVolume: () => {} });
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('shows 100% for volume 1', () => {
    render(VolumeSlider, { volume: 1, onVolume: () => {} });
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
