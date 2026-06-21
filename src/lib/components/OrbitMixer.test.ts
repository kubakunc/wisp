import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OrbitMixer from './OrbitMixer.svelte';

describe('OrbitMixer', () => {
  it('renders a node per layer and selects on tap', async () => {
    const onSelect = vi.fn();
    render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }, { soundId: 'ocean', volume: 0.5 }],
      selectedId: 'rain', timerLabel: '30 min', playing: true,
      onSelect, onTogglePlay: () => {}, onAdd: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: /Ocean/ }));
    expect(onSelect).toHaveBeenCalledWith('ocean');
  });

  it('fires onAdd from the add node', async () => {
    const onAdd = vi.fn();
    render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 1 }],
      selectedId: 'rain', timerLabel: 'Off', playing: false,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd
    });
    await fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('renders the central play/pause orb button', () => {
    render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }],
      selectedId: 'rain', timerLabel: '30 min', playing: false,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('orb shows Pause label when playing', () => {
    render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }],
      selectedId: 'rain', timerLabel: '30 min', playing: true,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('calls onTogglePlay when orb is tapped', async () => {
    const onTogglePlay = vi.fn();
    render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }],
      selectedId: 'rain', timerLabel: 'Off', playing: false,
      onSelect: () => {}, onTogglePlay, onAdd: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it('shows timerLabel in the orb', () => {
    render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }],
      selectedId: 'rain', timerLabel: '30 min', playing: true,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    expect(screen.getByText('30 min')).toBeTruthy();
  });

  it('renders all layer nodes', () => {
    render(OrbitMixer, {
      layers: [
        { soundId: 'rain', volume: 0.8 },
        { soundId: 'ocean', volume: 0.5 },
        { soundId: 'fan', volume: 0.3 }
      ],
      selectedId: null, timerLabel: 'Off', playing: false,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    expect(screen.getByRole('button', { name: 'Rain' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ocean' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fan' })).toBeTruthy();
  });

  it('renders with empty layers without error', () => {
    const { container } = render(OrbitMixer, {
      layers: [], selectedId: null, timerLabel: 'Off', playing: false,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    expect(container).toBeTruthy();
  });

  it('is fully declarative — selectedId prop controls selection, no internal state', () => {
    // With selectedId='ocean', rain should not be selected, ocean should be
    const { container } = render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }, { soundId: 'ocean', volume: 0.5 }],
      selectedId: 'ocean', timerLabel: 'Off', playing: false,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    const selectedNodes = container.querySelectorAll('.orbit-node.selected');
    expect(selectedNodes.length).toBe(1);
  });

  it('renders the progress ring SVG with gradient and arc circles', () => {
    const { container } = render(OrbitMixer, {
      layers: [{ soundId: 'rain', volume: 0.8 }],
      selectedId: null, timerLabel: 'Off', playing: false,
      onSelect: () => {}, onTogglePlay: () => {}, onAdd: () => {}
    });
    // Progress ring SVG must exist
    const ringSvg = container.querySelector('svg.progress-ring');
    expect(ringSvg).toBeTruthy();
    // Linear gradient def must be present
    const gradient = container.querySelector('linearGradient#ring-grad');
    expect(gradient).toBeTruthy();
    // Track and arc circles
    const circles = container.querySelectorAll('svg.progress-ring circle');
    expect(circles.length).toBe(2);
  });
});
