// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderWithFluent } from '../../test-utils/render';
import KpiSparkline from './KpiSparkline';

describe('KpiSparkline', () => {
  it('renders an area path for a sparkline series', () => {
    const { container } = renderWithFluent(
      <KpiSparkline values={[2, 8, 5]} color="#579bfc" variant="area" />,
    );
    expect(container.querySelector('[data-kpi-sparkline="area"]')).toBeTruthy();
  });

  it('renders composition segments for a bar series', () => {
    const { container } = renderWithFluent(
      <KpiSparkline values={[9, 8]} color="#a25ddc" colors={['#a25ddc', '#e2445c']} variant="bar" />,
    );
    expect(container.querySelector('[data-kpi-sparkline="bar"]')).toBeTruthy();
  });
});
