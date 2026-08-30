import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderViewStateDiffCard from './PurchaseOrderViewStateDiffCard';

describe('PurchaseOrderViewStateDiffCard', () => {
  it('toont diff-rijen met type-iconen en een more-count', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderViewStateDiffCard
          rows={[
            { kind: 'filter', label: 'Filter added:', detail: 'Status is exactly Open' },
            { kind: 'format', label: 'Conditional formatting:', detail: 'changed' },
            { kind: 'sort', label: 'Sort:', detail: 'Status' },
            { kind: 'category', label: 'Grouping:', detail: 'Vendor' },
          ]}
          moreCount={3}
          anchorRect={{ left: 40, top: 80, right: 200, width: 160, height: 32 }}
        />
      </FluentProvider>
    );

    const card = screen.getByRole('note');
    expect(card).toBeTruthy();
    expect(getComputedStyle(card).backgroundColor).not.toBe('transparent');
    expect(getComputedStyle(card).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(screen.getByText('Not in this view yet')).toBeTruthy();
    expect(screen.getByLabelText('Filter')).toBeTruthy();
    expect(screen.getByLabelText('Conditional formatting')).toBeTruthy();
    expect(screen.getByLabelText('Sort')).toBeTruthy();
    expect(screen.getByLabelText('Category')).toBeTruthy();
    expect(screen.getByText('Status is exactly Open')).toBeTruthy();
  });

  it('toont de rest na klik op more', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      kind: 'filter',
      label: 'Filter added:',
      detail: `Row ${index}`,
    }));
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderViewStateDiffCard
          rows={rows}
          anchorRect={{ left: 40, top: 80, right: 200, width: 160, height: 32 }}
        />
      </FluentProvider>
    );

    expect(screen.getByText('Row 0')).toBeTruthy();
    expect(screen.queryByText('Row 9')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+2 more' }));
    expect(screen.getByText('Row 9')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '+2 more' })).toBeNull();
  });
});

