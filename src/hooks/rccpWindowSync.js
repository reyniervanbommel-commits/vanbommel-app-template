/** In-memory bus so keep-alive RCCP and PO-board instances share the week window. */
let snapshot = null;
const listeners = new Set();

export function getRccpWindowSnapshot() {
  return snapshot;
}

export function publishRccpWindowState(state) {
  snapshot = state;
  listeners.forEach((listener) => listener(state));
}

export function subscribeRccpWindowState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: drop shared state between hook instances. */
export function resetRccpWindowSync() {
  snapshot = null;
  listeners.clear();
}
