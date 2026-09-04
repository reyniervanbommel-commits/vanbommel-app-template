import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUniqueColumnValues } from '../../utils/columnUniqueValues';
import PurchaseOrdersActiveFilterEditor from './PurchaseOrdersActiveFilterEditor';

vi.mock('../../utils/columnUniqueValues', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getUniqueColumnValues: vi.fn((...args) => actual.getUniqueColumnValues(...args)),
  };
});

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
  beforeEach(() => {
    getUniqueColumnValues.mockClear();
  });

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
    expect(getUniqueColumnValues).not.toHaveBeenCalled();
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
    expect(getUniqueColumnValues).not.toHaveBeenCalled();
  });

  it('scans unique values only for value-picker operators', () => {
    const column = { key: 'vendor', label: 'Vendor', dataType: 'text' };
    renderEditor({
      item: {
        columnKey: 'vendor',
        column,
        filter: { operator: 'oneOf', value: ['Acme'] },
      },
      headerColumns: [column],
      filterByColumn: { vendor: { operator: 'oneOf', value: ['Acme'] } },
      items: [{ values: { vendor: 'Acme' } }],
    });

    expect(getUniqueColumnValues).toHaveBeenCalledTimes(1);
  });

  it('restricts remarks filters to contains and has a comment without a unique picker', () => {
    const column = { key: 'remarks', label: 'Remarks', dataType: 'remarks' };
    const { applyColumnFilter } = renderEditor({
      item: {
        columnKey: 'remarks',
        column,
        filter: { operator: 'contains', value: 'ab', secondaryValue: '' },
      },
      headerColumns: [column],
      filterByColumn: { remarks: { operator: 'contains', value: 'ab', secondaryValue: '' } },
      items: [{ values: { remarks: 'older note' } }],
    });

    fireEvent.click(screen.getByRole('combobox', { name: 'Filter operator for Remarks' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'contains',
      'has a comment',
    ]);
    expect(getUniqueColumnValues).not.toHaveBeenCalled();
    expect(screen.queryByText('Filter by color')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(applyColumnFilter).toHaveBeenCalledWith('remarks', {
      operator: 'contains',
      value: 'ab',
      secondaryValue: '',
    });
  });

  it('applies has a comment without a value field', () => {
    const column = { key: 'remarks', label: 'Remarks', dataType: 'remarks' };
    const { applyColumnFilter } = renderEditor({
      item: {
        columnKey: 'remarks',
        column,
        filter: { operator: 'hasComment', value: '', secondaryValue: '' },
      },
      headerColumns: [column],
      filterByColumn: { remarks: { operator: 'hasComment', value: '' } },
    });

    expect(screen.queryByLabelText('Filter value for Remarks')).toBeNull();
    expect(screen.getByText('Matches rows with at least one comment.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(applyColumnFilter).toHaveBeenCalledWith('remarks', {
      operator: 'hasComment',
      value: '',
      secondaryValue: '',
    });
  });

  it('does not apply a remarks search shorter than 2 characters', () => {
    const column = { key: 'remarks', label: 'Remarks', dataType: 'remarks' };
    const { applyColumnFilter } = renderEditor({
      item: {
        columnKey: 'remarks',
        column,
        filter: { operator: 'contains', value: 'a', secondaryValue: '' },
      },
      headerColumns: [column],
      filterByColumn: { remarks: { operator: 'contains', value: 'a', secondaryValue: '' } },
    });

    expect(screen.getByText('Enter at least 2 characters')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(applyColumnFilter).not.toHaveBeenCalled();
  });

  it('does not apply a remarks search longer than 200 characters', () => {
    const overlong = 'a'.repeat(201);
    const column = { key: 'remarks', label: 'Remarks', dataType: 'remarks' };
    const { applyColumnFilter } = renderEditor({
      item: {
        columnKey: 'remarks',
        column,
        filter: { operator: 'contains', value: overlong, secondaryValue: '' },
      },
      headerColumns: [column],
      filterByColumn: { remarks: { operator: 'contains', value: overlong, secondaryValue: '' } },
    });

    expect(screen.getByText('Enter at most 200 characters')).toBeTruthy();
    expect(screen.queryByText('Enter at least 2 characters')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(applyColumnFilter).not.toHaveBeenCalled();
  });
});
