export const IDLE_TIMEOUT_MS = 45 * 60 * 1000;
export const IDLE_WARNING_LEAD_MS = 2 * 60 * 1000;
export const ACTIVITY_EVENTS = Object.freeze(['pointerdown', 'keydown', 'scroll', 'touchstart']);

/**
 * @param {number} idleMs
 * @param {number} warningLeadMs
 * @returns {{ warningAt: number, idleAt: number }}
 */
export function getIdleSchedule(idleMs, warningLeadMs) {
  const idleAt = Number.isFinite(idleMs) && idleMs > 0 ? idleMs : IDLE_TIMEOUT_MS;
  const lead = Number.isFinite(warningLeadMs) && warningLeadMs > 0 ? warningLeadMs : IDLE_WARNING_LEAD_MS;
  return {
    warningAt: Math.max(0, idleAt - lead),
    idleAt,
  };
}

export function formatIdleCountdown(secondsLeft) {
  if (secondsLeft == null) return 'soon';
  if (secondsLeft <= 1) return '1 second';
  return `${secondsLeft} seconds`;
}
