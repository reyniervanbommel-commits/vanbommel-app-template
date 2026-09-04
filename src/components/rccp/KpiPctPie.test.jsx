// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderWithFluent } from '../../test-utils/render';
import { KPI_PIE_GRAY, KPI_PIE_GRAY_LIGHT, resolveKpiPieColors } from '../../utils/kpiCardStyles';
import KpiPctPie from './KpiPctPie';
import KpiCard from './RccpKpiCard';

describe('KpiPctPie', () => {
  it('renders nothing without a percent', () => {
    const { container } = renderWithFluent(<KpiPctPie percent={null} />);
    expect(container.querySelector('[data-kpi-pct-pie]')).toBeNull();
  });

  it('renders 2 solid gray slices when no color is picked', () => {
    const { fill, rest, elevated } = resolveKpiPieColors({ color: null, colorTarget: 'value' });
    const { container } = renderWithFluent(
      <KpiPctPie percent={40} fillColor={fill} restColor={rest} elevated={elevated} />,
    );
    const pie = container.querySelector('[data-kpi-pct-pie]');
    expect(pie).toBeTruthy();
    expect(pie.getAttribute('aria-hidden')).toBe('true');
    const fills = [...container.querySelectorAll('path')].map((node) => node.getAttribute('fill'));
    expect(fills).toContain(KPI_PIE_GRAY);
    expect(fills).toContain(KPI_PIE_GRAY_LIGHT);
  });

  it('pops the colored slice outward with its own shadow', () => {
    const { fill, rest, elevated } = resolveKpiPieColors({ color: '#00c875', colorTarget: 'value' });
    const { container } = renderWithFluent(
      <KpiPctPie percent={40} fillColor={fill} restColor={rest} elevated={elevated} />,
    );
    const paths = [...container.querySelectorAll('path')];
    const coloredPath = paths.find((node) => node.getAttribute('fill') === '#00c875');
    const grayPath = paths.find((node) => node.getAttribute('fill') === KPI_PIE_GRAY);
    expect(coloredPath.outerHTML).toContain('drop-shadow');
    expect(coloredPath.outerHTML).toContain('translate');
    expect(grayPath.outerHTML).not.toContain('drop-shadow');
  });
});

describe('KpiCard pie background', () => {
  it('shows a pie only when a percentage is present', () => {
    const withPct = renderWithFluent(
      <KpiCard kpiKey="delivered" label="Total delivered" qty={26084} hash pct="99.5%" />,
    );
    expect(withPct.container.querySelector('[data-kpi-pct-pie]')).toBeTruthy();

    const withoutPct = renderWithFluent(
      <KpiCard kpiKey="ordered" label="Total ordered" qty={26200} hash />,
    );
    expect(withoutPct.container.querySelector('[data-kpi-pct-pie]')).toBeNull();
  });
});
