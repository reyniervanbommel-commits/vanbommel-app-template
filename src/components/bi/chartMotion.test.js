import { describe, expect, it } from 'vitest';
import { CHART_ANIMATION_MS, chartMotionProps } from './chartMotion';

describe('chartMotionProps', () => {
  it('disables animation when motion is reduced', () => {
    expect(chartMotionProps(true)).toEqual({
      isAnimationActive: false,
      animationDuration: 0,
    });
  });

  it('enables a short ease-out tween by default', () => {
    expect(chartMotionProps(false)).toEqual({
      isAnimationActive: true,
      animationDuration: CHART_ANIMATION_MS,
      animationEasing: 'ease-out',
    });
  });
});
