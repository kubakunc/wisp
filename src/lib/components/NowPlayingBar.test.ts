import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NowPlayingBar from './NowPlayingBar.svelte';

describe('NowPlayingBar', () => {
  it('renders a play button when not playing', () => {
    render(NowPlayingBar, { playing: false, soundCount: 2, onPlayPause: () => {}, onOpen: () => {} });
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('renders a pause button when playing', () => {
    render(NowPlayingBar, { playing: true, soundCount: 2, onPlayPause: () => {}, onOpen: () => {} });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('shows "Paused" text when not playing', () => {
    render(NowPlayingBar, { playing: false, soundCount: 2, onPlayPause: () => {}, onOpen: () => {} });
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  it('shows sound count when playing with multiple sounds', () => {
    render(NowPlayingBar, { playing: true, soundCount: 3, onPlayPause: () => {}, onOpen: () => {} });
    expect(screen.getByText('3 sounds')).toBeTruthy();
  });

  it('shows singular "1 sound" for one sound', () => {
    render(NowPlayingBar, { playing: true, soundCount: 1, onPlayPause: () => {}, onOpen: () => {} });
    expect(screen.getByText('1 sound')).toBeTruthy();
  });

  it('calls onPlayPause when play/pause button clicked', async () => {
    const onPlayPause = vi.fn();
    render(NowPlayingBar, { playing: false, soundCount: 1, onPlayPause, onOpen: () => {} });
    await fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onPlayPause).toHaveBeenCalledOnce();
  });

  it('calls onOpen when the open button is clicked', async () => {
    const onOpen = vi.fn();
    render(NowPlayingBar, { playing: true, soundCount: 2, onPlayPause: () => {}, onOpen });
    await fireEvent.click(screen.getByRole('button', { name: 'Open mixer' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
