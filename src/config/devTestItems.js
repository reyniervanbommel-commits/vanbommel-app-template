// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
// Rechtsonder op DEV opent DevFeatureChecklist deze checks als afvinkbare vakjes.
export const devTestItems = [
  {
    id: 'feature-291-azure-night-wekker-v1-52-69',
    title: 'Feature 291 - Azure night-refresh wekker (v1.52.69)',
    checks: [
      'Settings → D365 refresh info text names Azure Logic App and 03:00 Europe/Amsterdam (not GitHub Actions or 00:00 UTC)',
      'Admin Start on D365 refresh still starts a manual run as before',
      'Night API on DEV returns 503 (production-only); no Logic App on DEV',
    ],
  },
  {
    id: 'rccp-semantic-slots',
    title: 'RCCP semantic field slots (#298)',
    checks: [
      'RCCP Settings → Data shows Vendor, Requested delivery date, Confirmed delivery date, Receipt date; date lists exclude text columns such as item name',
      'RCCP Settings → Quantities shows exactly three slots Open / Received / Ordered, with no Add or Delete; Ordered shows Chart type',
      'Data model has no RCCP value column toggle',
      'A PO with confirmed delivery in another ISO week than requested stays on the requested week until Load date is Confirmed; empty or 1-1-1900 confirmed then has no above-axis load',
      'RCCP toolbar Load date Requested/Confirmed places open and ordered on that date with no fallback; Received stays below the axis only when both confirmed and receipt dates are real',
      'Stacked bar: dark Open on light Ordered−Open; toggling Ordered off leaves only the dark Open slice',
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
