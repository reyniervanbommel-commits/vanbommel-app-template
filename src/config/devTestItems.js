// Testchecklist voor de DEV-omgeving. Leeg na een PROD-deploy (schone lei);
// push-feature-to-dev voegt automatisch nieuwe items toe zodra een feature naar DEV gaat.
// Format per item: { id, title, checks: ['wat de tester controleert', ...] }.
export const devTestItems = [
  {
    id: 'perf-frontend-timing',
    title: 'Performance: compressie, code-splitting + timing-infra (#AB:142)',
    checks: [
      'Eerste laadtijd: DevTools → Network toont gecomprimeerde, opgesplitste JS-chunks (niet één grote bundle)',
      'Het board opent normaal; /admin laadt pas dán de grafiek-chunk (vendor-charts)',
      'DevTools → Network → een /api-call → tab Timing toont Server-Timing (app + tb_read_sql)',
      'De ⚡ perf-HUD linksonder toont laadtijd + recente API-calls (alleen op DEV/preview, niet PROD)',
      'Console toont per API-call de duur ([api] GET ... → 200 in Nms)',
    ],
  },
];
