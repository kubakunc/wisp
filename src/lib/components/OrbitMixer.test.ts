import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OrbitMixer from './OrbitMixer.svelte';
import type { MixLayer } from '$lib/types';

const layers: MixLayer[] = [
  { soundId: 'rain', volume: 0.8 },
  { soundId: 'ocean', volume: 0.5 },
  { soundId: 'fan', volume: 0.3 }
];

describe('OrbitMixer', () => {
  it('renders orbit nodes for each layer', () => {
    render(OrbitMixer, { layers, onTapLayer: () => {}, onVolume: () => {} });
    expect(screen.getByRole('button', { name: 'Rain' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ocean' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fan' })).toBeTruthy();
  });

  it('calls onTapLayer when a node is tapped', async () => {
    const onTapLayer = vi.fn();
    render(OrbitMixer, { layers, onTapLayer, onVolume: () => {} });
    await fireEvent.click(screen.getByRole('button', { name: 'Ocean' }));
    expect(onTapLayer).toHaveBeenCalledWith('ocean');
  });

  it('renders a volume slider', () => {
    const { container } = render(OrbitMixer, { layers, onTapLayer: () => {}, onVolume: () => {} });
    const input = container.querySelector('input[type="range"]');
    expect(input).toBeTruthy();
  });

  it('calls onVolume when slider changes', async () => {
    const onVolume = vi.fn();
    const { container } = render(OrbitMixer, { layers, onTapLayer: () => {}, onVolume });
    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '0.6' } });
    expect(onVolume).toHaveBeenCalled();
  });

  it('renders with empty layers without error', () => {
    const { container } = render(OrbitMixer, { layers: [], onTapLayer: () => {}, onVolume: () => {} });
    expect(container).toBeTruthy();
  });
});
