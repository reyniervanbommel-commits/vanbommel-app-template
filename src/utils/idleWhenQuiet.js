// Draait `callback` pas wanneer de browser idle is (requestIdleCallback, fallback setTimeout)
// én er een korte periode geen gebruikersinput was (scroll/toets/pointer). Elke input-event
// tijdens het wachten reset de klok, zodat een prefetch nooit een actieve scroll/type-sessie
// onderbreekt. Bedoeld voor achtergrondwerk dat de virtualized PO-tabel niet mag raken.

const INPUT_EVENTS = ['keydown', 'wheel', 'pointerdown', 'touchstart'];

export function runWhenIdleAndQuiet(callback, options = {}) {
  const idleTimeoutMs = options.idleTimeoutMs ?? 800;
  const quietMs = options.quietMs ?? 400;
  let cancelled = false;
  let idleId = null;
  let usedRic = false;
  let quietTimer = null;

  const armQuietThenRun = () => {
    if (cancelled) return;
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      if (!cancelled) callback();
    }, quietMs);
  };

  function scheduleIdle() {
    if (cancelled) return;
    const ric = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : null;
    if (ric) {
      usedRic = true;
      idleId = ric(armQuietThenRun, { timeout: idleTimeoutMs });
    } else {
      usedRic = false;
      idleId = setTimeout(armQuietThenRun, idleTimeoutMs);
    }
  }

  const onInput = () => {
    if (cancelled) return;
    clearTimeout(quietTimer);
    // In-flight HTTP van een reeds gestarte stap wordt niet afgebroken (caller bepaalt stappen);
    // dit reset alleen de idle+quiet-klok voor de volgende stap.
    if (usedRic && typeof window.cancelIdleCallback === 'function' && idleId != null) {
      window.cancelIdleCallback(idleId);
    } else {
      clearTimeout(idleId);
    }
    scheduleIdle();
  };

  INPUT_EVENTS.forEach((type) => window.addEventListener(type, onInput, { passive: true }));
  scheduleIdle();

  return {
    cancel() {
      cancelled = true;
      clearTimeout(quietTimer);
      if (usedRic && typeof window.cancelIdleCallback === 'function' && idleId != null) {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
      INPUT_EVENTS.forEach((type) => window.removeEventListener(type, onInput));
    },
  };
}
