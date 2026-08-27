// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpKpiCards from './RccpKpiCards';

const kpis = {
  totalOrdered: 17,
  totalDelivered: 4,
  totalOpen: 13,
  deliveredPercent: 23.5,
  openPercent: 76.5,
  openItemCount: 2,
  lateDeliveryUnits: 4,
  lateDeliveryItemCount: 2,
  lateDeliveryPercent: 23.5,
  lateDeliveryAvgDays: 14,
  onTimeUnits: 2,
  onTimeItemCount: 1,
  onTimePercent: 11.8,
  openLateUnits: 13,
  openLateItemCount: 2,
  openLateAvgDays: 4.5,
  planned1900Units: 8,
  planned1900ItemCount: 1,
  validPlannedUnits: 9,
  validPlannedPercent: 52.9,
  deliveryReliabilityPercent: 50,
  capacityShortfall: null,
  overloadedWeeks: null,
};

describe('RccpKpiCards', () => {
  it('renders the data-completeness and delivery-reliability tiles', () => {
    renderWithFluent(<RccpKpiCards kpis={kpis} />);
    expect(screen.getByText('Valid planned dates')).toBeTruthy();
    expect(screen.getByText('Delivery reliability')).toBeTruthy();
    expect(screen.getByText('52.9')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });
});
