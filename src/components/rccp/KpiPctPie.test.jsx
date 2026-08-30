// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderWithFluent } from '../../test-utils/render';
import { applyOpacity, getRgbHex } from '../../utils/hexColor';
import { KPI_PIE_GRAY } from '../../utils/kpiCardStyles';
import KpiPctPie from './KpiPctPie';
import KpiCard from './RccpKpiCard';

describe('KpiPctPie', () => {
  it('renders nothing without a percent', () => {
    const { container } = renderWithFluent(<KpiPctPie percent={null} />);
    expect(container.querySelector('[data-kpi-pct-pie]')).toBeNull();
  });

  it('renders a background pie with gray rest and fill', () => {
    const { container } = renderWithFluent(<KpiPctPie percent={99.5} />);
    const pie = container.querySelector('[data-kpi-pct-pie]');
    expect(pie).toBeTruthy();
    expect(pie.getAttribute('aria-hidden')).toBe('true');
    const fills = [...container.querySelectorAll('circle, path')].map((node) => node.getAttribute('fill'));
    expect(fills).toContain(applyOpacity(KPI_PIE_GRAY, 50));
    fills.forEach((fill) => {
      expect(getRgbHex(fill)).toBe(KPI_PIE_GRAY);
    });
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
