import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OrbitNode from './OrbitNode.svelte';

describe('OrbitNode', () => {
  it('renders with a valid soundId: shows SoundIcon and sound name as aria-label', () => {
    render(OrbitNode, {
      id: 'rain', volume: 0.8, selected: false, angleDeg: 0, onSelect: () => {}
    });
    const btn = screen.getByRole('button', { name: 'Rain' });
    expect(btn).toBeTruthy();
    // SoundIcon is aria-hidden, but the button has the correct label
    expect(btn.getAttribute('aria-label')).toBe('Rain');
  });

  it('renders with an unknown soundId: fallback text and raw id as aria-label', () => {
    render(OrbitNode, {
      id: 'unknown-xyz', volume: 0.5, selected: false, angleDeg: 90, onSelect: () => {}
    });
    const btn = screen.getByRole('button', { name: 'unknown-xyz' });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('unknown-xyz');
    // fallback letters shown
    expect(btn.querySelector('.fallback-id')).toBeTruthy();
  });

  it('applies selected class when selected=true', () => {
    const { container } = render(OrbitNode, {
      id: 'rain', volume: 0.8, selected: true, angleDeg: 0, onSelect: () => {}
    });
    expect(container.querySelector('.orbit-node.selected')).toBeTruthy();
  });

  it('does not apply selected class when selected=false', () => {
    const { container } = render(OrbitNode, {
      id: 'rain', volume: 0.8, selected: false, angleDeg: 0, onSelect: () => {}
    });
    expect(container.querySelector('.orbit-node.selected')).toBeFalsy();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(OrbitNode, {
      id: 'rain', volume: 0.8, selected: false, angleDeg: 45, onSelect
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Rain' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('positions itself based on angleDeg (non-zero left/top)', () => {
    const { container } = render(OrbitNode, {
      id: 'ocean', volume: 0.6, selected: false, angleDeg: 0, onSelect: () => {}
    });
    const btn = container.querySelector('.orbit-node') as HTMLElement;
    expect(btn?.style.left).toBeTruthy();
    expect(btn?.style.top).toBeTruthy();
  });
});
