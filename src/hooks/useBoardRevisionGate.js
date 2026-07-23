import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

// Gedeeld, lichtgewicht versheidssignaal voor de keep-alive datapagina's. Omdat alleen de
// PO-pagina data muteert die RCCP en BI raakt, is de PO-revisie het enige signaal dat we hoeven
// te checken. De revisie is een goedkope hash-call (GET .../revision) — veel lichter dan de
// volledige board-read of RCCP/BI-aggregatie.
const PO_REVISION_ENDPOINT = '/data/purchase-orders/revision';

/**
 * Draait een lichte PO-revisie-check zodra een keep-alive pagina (weer) actief wordt, en geeft
 * de laatst opgehaalde revisie terug. De consument beslist wat er bij een verse revisie gebeurt
 * (bv. stil herladen bij mismatch, of doorgeven als dataRevision).
 *
 * @param {object} params
 * @param {boolean} params.active                Of de pagina momenteel zichtbaar/actief is.
 * @param {boolean} [params.enabled=true]        Uit → geen checks.
 * @param {(revision: string|null) => void} [params.onRevision]  Callback bij elke verse revisie.
 * @param {boolean} [params.runOnMount=false]    Ook checken bij de allereerste activatie.
 * @returns {{ revision: string|null, checking: boolean, error: string, check: () => Promise<string|null> }}
 */
export function useBoardRevisionGate({ active, enabled = true, onRevision, runOnMount = false } = {}) {
  const [revision, setRevision] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // onRevision via ref zodat een instabiele callback de transitie-effect-deps niet vervuilt.
  const onRevisionRef = useRef(onRevision);
  useEffect(() => { onRevisionRef.current = onRevision; }, [onRevision]);

  const check = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const res = await apiRequest(PO_REVISION_ENDPOINT);
      const next = res?.revision ?? null;
      setRevision(next);
      if (onRevisionRef.current) onRevisionRef.current(next);
      return next;
    } catch (err) {
      setError(err?.message || 'Revision check failed');
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  // Detecteer de inactief→actief transitie (terugkeer naar de pagina). null = nog nooit gerenderd.
  const prevActiveRef = useRef(null);
  useEffect(() => {
    if (!enabled) {
      prevActiveRef.current = active;
      return;
    }
    const prev = prevActiveRef.current;
    prevActiveRef.current = active;
    const firstRender = prev === null;
    const reactivated = prev === false && active === true;
    if (reactivated || (firstRender && active && runOnMount)) {
      check();
    }
  }, [active, enabled, runOnMount, check]);

  return { revision, checking, error, check };
}
