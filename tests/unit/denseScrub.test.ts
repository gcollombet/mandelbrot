import { describe, it, expect, vi } from 'vitest';
import { useDenseScrub } from '../../src/components/dense/useDenseScrub';

function setup(disabled = false) {
  const set = vi.fn();
  const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(), closest: () => disabled ? {} : null };
  const event = (x: number, y: number, pointerType = 'touch') => ({
    button: 0, clientX: x, clientY: y, pointerType, pointerId: 1,
    currentTarget: target, preventDefault: vi.fn(), shiftKey: false,
  }) as unknown as PointerEvent;
  const scrub = useDenseScrub({ min: 0, max: 100, step: 1, get: () => 50, set });
  return { scrub, set, event };
}

describe('dense numeric field interaction', () => {
  it('does not edit values during vertical touch scrolling or a tap', () => {
    const { scrub, set, event } = setup();
    const down = event(10, 10);
    scrub.onPointerDown(down);
    expect(down.preventDefault).not.toHaveBeenCalled();
    scrub.onPointerMove(event(12, 35));
    scrub.onPointerMove(event(50, 60));
    scrub.endScrub(event(50, 60));
    expect(set).not.toHaveBeenCalled();
  });
  it('changes a value only after a deliberate horizontal drag, clamped to the range', () => {
    const { scrub, set, event } = setup();
    scrub.onPointerDown(event(10, 10));
    scrub.onPointerMove(event(13, 11));
    expect(set).not.toHaveBeenCalled();
    scrub.onPointerMove(event(230, 11));
    expect(set).toHaveBeenLastCalledWith(100);
    scrub.endScrub(event(230, 11));
    scrub.onPointerMove(event(0, 11));
    expect(set).toHaveBeenCalledTimes(1);
  });
  it('respects a disabled export configuration', () => {
    const { scrub, set, event } = setup(true);
    scrub.onPointerDown(event(10, 10));
    scrub.onPointerMove(event(200, 10));
    expect(set).not.toHaveBeenCalled();
  });
});
