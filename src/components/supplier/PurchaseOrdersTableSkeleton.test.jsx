import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithFluent } from '../../test-utils/render';
import PurchaseOrdersTableSkeleton from './PurchaseOrdersTableSkeleton';

describe('PurchaseOrdersTableSkeleton', () => {
  it('shows the Fluent table skeleton with an accessible loading label', () => {
    const { container } = renderWithFluent(
      <PurchaseOrdersTableSkeleton label="Loading purchase orders from SQL cache" />,
    );

    expect(screen.getByRole('progressbar', {
      name: 'Loading purchase orders from SQL cache',
    })).toBeTruthy();
    expect(container.querySelector('.fui-Spinner')).toBeNull();
    expect(container.querySelectorAll('.fui-SkeletonItem').length).toBeGreaterThan(0);
  });
});
