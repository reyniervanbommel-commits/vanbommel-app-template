import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderBulkEditFailedRows from './PurchaseOrderBulkEditFailedRows';

function wrap(ui) {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
}

describe('PurchaseOrderBulkEditFailedRows', () => {
  const rows = [
    {
      key: 'USMF|PO2',
      dataAreaId: 'USMF',
      orderNumber: 'PO2',
      errorMessage: 'The value changed in D365 since you read it.',
    },
  ];

  it('toont order, foutmelding en retry-acties', () => {
    wrap(
      <PurchaseOrderBulkEditFailedRows
        rows={rows}
        retrying={false}
        onRetryRow={vi.fn()}
        onRetryAllFailed={vi.fn()}
      />,
    );
    expect(screen.getByText('USMF|PO2')).toBeTruthy();
    expect(screen.getByText('The value changed in D365 since you read it.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry all failed' })).toBeTruthy();
    expect(screen.getByText('1 row failed')).toBeTruthy();
  });

  it('zet retry-knoppen uit tijdens retrying', () => {
    wrap(
      <PurchaseOrderBulkEditFailedRows
        rows={rows}
        retrying
        onRetryRow={vi.fn()}
        onRetryAllFailed={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retry all failed' })).toBeDisabled();
  });
});
