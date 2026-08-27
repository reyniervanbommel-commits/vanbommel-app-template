import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PurchaseOrdersBoardTotalsRow from './PurchaseOrdersBoardTotalsRow';

describe('PurchaseOrdersBoardTotalsRow', () => {
  it('renders formatted sums for selected header columns', () => {
    render(
      <table>
        <PurchaseOrdersBoardTotalsRow
          columns={[
            { key: 'amount', label: 'Amount', dataType: 'number' },
            { key: 'status', label: 'Status', dataType: 'text' },
          ]}
          columnSumKeys={['amount']}
          summedValuesByColumn={{ amount: 30 }}
          collapsedHeaderColumnKeys={[]}
          totalsCellClassName="totals"
          controlCellClassName="control"
        />
      </table>
    );

    expect(screen.getByText('30')).toBeTruthy();
  });
});
