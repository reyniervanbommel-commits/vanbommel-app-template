import { KPI_FORMULAS } from './rccpKpiFormulas';

it('mentions requested vs confirmed comparison for late and on-time', () => {
  expect(KPI_FORMULAS.lateDelivery.toLowerCase()).toMatch(/planned|confirmed|comparison/);
  expect(KPI_FORMULAS.planned1900.toLowerCase()).toMatch(/1-1-1900|confirmed/);
  expect(KPI_FORMULAS.dateCoverage.toLowerCase()).toMatch(/requested|confirmed/);
});
