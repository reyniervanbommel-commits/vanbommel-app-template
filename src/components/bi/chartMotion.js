export const CHART_ANIMATION_MS = 450;

/**
 * Recharts motion props. Reduced motion: no tween.
 * @param {boolean} reduceMotion
 */
export function chartMotionProps(reduceMotion) {
  if (reduceMotion) {
    return { isAnimationActive: false, animationDuration: 0 };
  }
  return {
    isAnimationActive: true,
    animationDuration: CHART_ANIMATION_MS,
    animationEasing: 'ease-out',
  };
}
