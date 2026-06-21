import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowPlayingBar from './NowPlayingBar.svelte';

describe('NowPlayingBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(NowPlayingBar, {
      count: 0, names: '', playing: false, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders the bar when count > 0', () => {
    render(NowPlayingBar, {
      count: 2, names: 'Rain, Ocean', playing: true, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(screen.getByText(/Playing · 2 sounds/)).toBeTruthy();
  });

  it('shows plural "sounds" for multiple sounds', () => {
    render(NowPlayingBar, {
      count: 3, names: 'Rain, Ocean, Fan', playing: true, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(screen.getByText(/Playing · 3 sounds/)).toBeTruthy();
  });

  it('shows singular "sound" for one sound', () => {
    render(NowPlayingBar, {
      count: 1, names: 'Rain', playing: true, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(screen.getByText(/Playing · 1 sound/)).toBeTruthy();
  });

  it('renders the names string', () => {
    render(NowPlayingBar, {
      count: 2, names: 'Rain, Ocean', playing: true, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(screen.getByText('Rain, Ocean')).toBeTruthy();
  });

  it('renders a play button when not playing', () => {
    render(NowPlayingBar, {
      count: 1, names: 'Rain', playing: false, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('renders a pause button when playing', () => {
    render(NowPlayingBar, {
      count: 1, names: 'Rain', playing: true, onOpen: () => {}, onTogglePlay: () => {}
    });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('calls onTogglePlay when play/pause button clicked and does not bubble to onOpen', async () => {
    const onTogglePlay = vi.fn();
    const onOpen = vi.fn();
    render(NowPlayingBar, {
      count: 1, names: 'Rain', playing: false, onOpen, onTogglePlay
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('calls onOpen when bar body clicked (Open mixer)', async () => {
    const onOpen = vi.fn();
    render(NowPlayingBar, {
      count: 2, names: 'Rain, Ocean', playing: true, onOpen, onTogglePlay: () => {}
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Open mixer' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('shows equalizer bars when playing', () => {
    const { container } = render(NowPlayingBar, {
      count: 1, names: 'Rain', playing: true, onOpen: () => {}, onTogglePlay: () => {}
    });
    const bars = container.querySelectorAll('.bar');
    expect(bars.length).toBe(3);
  });

  it('hides equalizer bars when not playing', () => {
    const { container } = render(NowPlayingBar, {
      count: 1, names: 'Rain', playing: false, onOpen: () => {}, onTogglePlay: () => {}
    });
    const bars = container.querySelectorAll('.bar');
    expect(bars.length).toBe(0);
  });
});
