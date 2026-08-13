// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'po-scroll-tier-a',
    title: '#253 Tier A: Scroll quick-wins (rAF-gate, overscan, startTransition, contain)',
    checks: [
      'Verticaal scrollen op het PO-bord verloopt vloeiend zonder merkbare hapering',
      'Snelle wheel/trackpad-scroll toont geen freeze of lange frames (DevTools > Performance)',
      'Rijen worden correct gemount bij alle scrollposities (geen missende rijen)',
      'Scroll-positie springt niet terug na snel scrollen',
      'DevTools console: geen React-warnings over startTransition of measurelabels',
      'perf-HUD (linksonder) toont board:window-update meetpunten bij scrollen',
    ],
  },
  {
    id: 'feature-252-po-scroll-tier-b-v1-47-0',
    title: '#254 Tier B: Scroll deep-wins — kolom-virtualisatie, tooltip, GPU-layer (v1.47.0)',
    checks: [
      'Horizontaal scrollen toont geen misalignment tussen header en body-cellen',
      'Sticky controlekolom (checkbox/expand/badge) blijft zichtbaar bij horizontaal scrollen',
      'Categorie-headers scrollen niet mee — sticky-gedrag werkt correct bij alle scrollposities',
      'Productafbeelding-tooltip verschijnt pas na hoveren (niet meteen bij rij-mount)',
      'Geen zichtbare pop-in van kolommen bij snel horizontaal scrollen',
      'Bij snel verticaal scrollen: geen zichtbare sprong van categorie-header naar gepinde positie',
      'perf-HUD: board:window-update meetpunten aanwezig bij zowel verticaal als horizontaal scrollen',
    ],
  },
];

/** Flat checklist rows for DevFeatureChecklist (one checkbox per check line). */
export function buildDevChecklistItems(items = devTestItems) {
  return items.flatMap((feature) =>
    (feature.checks || []).map((check, index) => ({
      id: `${feature.id}--${index}`,
      label: check,
      title: feature.title,
    }))
  );
}
