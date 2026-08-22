import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrdersActiveFilterEditor from './PurchaseOrdersActiveFilterEditor';

function renderEditor(props = {}) {
  const applyColumnFilter = vi.fn();
  const column = { key: 'vendor', label: 'Vendor', dataType: 'text' };
  const item = {
    columnKey: 'vendor',
    column,
    filter: { operator: 'contains', value: 'Alpha', secondaryValue: '' },
  };

  render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrdersActiveFilterEditor
        item={item}
        applyColumnFilter={applyColumnFilter}
        setColumnColorFilter={vi.fn()}
        items={[]}
        headerColumns={[column]}
        filterByColumn={{ vendor: item.filter }}
        datePeriodDisplayModes={{}}
        headerColumnFormatRules={{}}
        lineColumnFormatRules={{}}
        {...props}
      />
    </FluentProvider>
  );

  return { applyColumnFilter };
}

describe('PurchaseOrdersActiveFilterEditor', () => {
  it('applies an edited text contains filter without closing the flyout', () => {
    const { applyColumnFilter } = renderEditor();

    fireEvent.change(screen.getByLabelText('Filter value for Vendor'), {
      target: { value: 'Beta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(applyColumnFilter).toHaveBeenCalledTimes(1);
    expect(applyColumnFilter).toHaveBeenCalledWith('vendor', {
      operator: 'contains',
      value: 'Beta',
      secondaryValue: '',
    });
  });

  it('renders date equals filters with a date input', () => {
    const column = { key: 'requestedDate', label: 'Requested date', dataType: 'date' };
    renderEditor({
      item: {
        columnKey: 'requestedDate',
        column,
        filter: { operator: 'equals', value: '2026-08-22', secondaryValue: '' },
      },
      headerColumns: [column],
      filterByColumn: {
        requestedDate: { operator: 'equals', value: '2026-08-22', secondaryValue: '' },
      },
    });

    const valueInput = screen.getByLabelText('Filter value for Requested date');

    expect(valueInput.tagName).toBe('INPUT');
    expect(valueInput.getAttribute('type')).toBe('date');
  });
});
