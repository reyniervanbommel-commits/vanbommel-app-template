// Session-scoped in-memory board cache voor de main table.
//
// Vervangt de oude 5-min-TTL-cache: er is geen tijdslimiet meer. In plaats daarvan beslist een
// lichtgewicht revision-check (GET /data/:tableKey/revision) bij terugkeer naar de tabel of de
// gecachte data nog actueel is. Zo blijft SQL de bron van waarheid zonder elke keer het zware
// read-pad te doorlopen.
//
// Alleen in-memory (geen localStorage) conform .cursor/rules/data-en-security.mdc: bord-data mag
// niet buiten de tab-sessie blijven bestaan. De cache leegt vanzelf bij een harde refresh/tab-sluit.

let cachedBoard = null;

// Geeft { payload, revision } terug, of null als er niets gecached is.
export function getCachedBoard() {
  return cachedBoard;
}

// Slaat payload + bijbehorende revision atomair samen op (revision komt uit dezelfde read).
export function setCachedBoard(payload, revision) {
  if (!payload || typeof payload !== 'object') {
    return;
  }
  cachedBoard = { payload, revision: revision ?? null };
}

export function clearCachedBoard() {
  cachedBoard = null;
}
