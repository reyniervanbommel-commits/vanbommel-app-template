import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVITY_EVENTS, getIdleSchedule, IDLE_TIMEOUT_MS, IDLE_WARNING_LEAD_MS } from '../utils/idleSession';

/**
 * Fires a warning, then an idle callback, after a period without user input.
 * Background API polling does not reset the timer — only pointer/key/scroll/touch.
 *
 * @param {object} params
 * @param {boolean} params.enabled
 * @param {number} [params.idleMs]
 * @param {number} [params.warningLeadMs]
 * @param {() => void} [params.onIdle]
 * @returns {{ warningOpen: boolean, secondsLeft: number | null, staySignedIn: () => void }}
 */
export function useIdleSession({
  enabled,
  idleMs = IDLE_TIMEOUT_MS,
  warningLeadMs = IDLE_WARNING_LEAD_MS,
  onIdle,
}) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const warningTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const clearTimers = useCallback(() => {
    window.clearTimeout(warningTimerRef.current);
    window.clearTimeout(idleTimerRef.current);
    window.clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    idleTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startCountdown = useCallback((ms) => {
    setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    countdownRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev == null || prev <= 1) {
          window.clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const schedule = useCallback(() => {
    clearTimers();
    setWarningOpen((open) => (open ? false : open));
    setSecondsLeft((value) => (value == null ? value : null));
    const { warningAt, idleAt } = getIdleSchedule(idleMs, warningLeadMs);
    warningTimerRef.current = window.setTimeout(() => {
      setWarningOpen(true);
      startCountdown(Math.min(warningLeadMs, idleMs));
    }, warningAt);
    idleTimerRef.current = window.setTimeout(() => {
      setWarningOpen(false);
      onIdleRef.current?.();
    }, idleAt);
  }, [clearTimers, idleMs, warningLeadMs, startCountdown]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setWarningOpen(false);
      setSecondsLeft(null);
      return undefined;
    }
    schedule();
    const onActivity = () => schedule();
    const opts = { capture: true, passive: true };
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, opts);
    });
    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity, opts);
      });
    };
  }, [enabled, schedule, clearTimers]);

  return { warningOpen, secondsLeft, staySignedIn: schedule };
}
