// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpPoSegmentTooltip, {
  firstChartDataAreaId,
  isSameRccpHover,
} from './RccpPoSegmentTooltip';

const segment = {
  itemNumber: 'SKU-1',
  qty: 4,
  status: 'open',
  late: false,
  dataAreaId: 'whsl',
};

describe('RccpPoSegmentTooltip', () => {
  it('shows the product image for the hovered item', () => {
    const { container } = renderWithFluent(
      <RccpPoSegmentTooltip active label="2026-W12" segment={segment} />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('Product image for SKU-1');
    expect(img.getAttribute('src')).toBe(
      '/api/media/product-image?dataAreaId=whsl&itemNumber=SKU-1',
    );
    expect(screen.getByText('Item: SKU-1')).toBeTruthy();
  });

  it('uses the fallback company when the segment has none', () => {
    const { container } = renderWithFluent(
      <RccpPoSegmentTooltip
        active
        label="2026-W12"
        segment={{ ...segment, dataAreaId: '' }}
        fallbackDataAreaId="nl01"
      />,
    );
    const img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe(
      '/api/media/product-image?dataAreaId=nl01&itemNumber=SKU-1',
    );
  });

  it('omits the image when company or item is missing', () => {
    const { container } = renderWithFluent(
      <RccpPoSegmentTooltip
        active
        label="2026-W12"
        segment={{ ...segment, itemNumber: '', dataAreaId: '' }}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('treats pointer movement as the same hover target', () => {
    const prev = { segment, label: '2026-W12', x: 10, y: 10 };
    expect(isSameRccpHover(prev, { segment, label: '2026-W12', x: 40, y: 18 })).toBe(true);
    expect(isSameRccpHover(prev, { segment, label: '2026-W13', x: 40, y: 18 })).toBe(false);
  });

  it('reads the first company from chart segments', () => {
    expect(firstChartDataAreaId([
      { segmentsAbove: [{ itemNumber: 'A', dataAreaId: '' }], segmentsBelow: [] },
      { segmentsAbove: [{ itemNumber: 'B', dataAreaId: 'nl01' }], segmentsBelow: [] },
    ])).toBe('nl01');
  });
});
