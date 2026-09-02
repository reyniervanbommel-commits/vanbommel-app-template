// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrderLinkedHeaderValue from './PurchaseOrderLinkedHeaderValue';

const LINE_COLUMN = {
  id: 44,
  key: 'color',
  label: 'Color',
  dataType: 'text',
  writableToD365: true,
  d365Field: 'Color',
};

function renderValue(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderLinkedHeaderValue
        order={{
          dataAreaId: 'nl01',
          orderNumber: 'PO-1',
          linkedLineValues: { colorValues: ['Red'] },
        }}
        headerColumnKey="colorValues"
        meta={{
          lineColumnKey: 'color',
          lineColumnId: 44,
          lineDataType: 'text',
          lineColumnLabel: 'Color',
          writableToD365: false,
          lineColumn: LINE_COLUMN,
        }}
        {...props}
      />
    </FluentProvider>
  );
}

describe('PurchaseOrderLinkedHeaderValue', () => {
  it('renders a read-only value when the source line is not writable', () => {
    renderValue();
    expect(screen.getByText('Red')).toBeTruthy();
    expect(screen.queryByLabelText(/write back to D365 on all lines/)).toBeNull();
  });

  it('renders a write-back input for a writable pushed line column', () => {
    renderValue({
      onCorrectAllLines: vi.fn(),
      meta: {
        lineColumnKey: 'color',
        lineColumnId: 44,
        lineDataType: 'text',
        lineColumnLabel: 'Color',
        writableToD365: true,
        lineColumn: LINE_COLUMN,
      },
    });
    expect(screen.getByLabelText(/write back to D365 on all lines/)).toBeTruthy();
  });

  it('keeps the +N badge next to the editor when values differ', () => {
    renderValue({
      onCorrectAllLines: vi.fn(),
      order: {
        dataAreaId: 'nl01',
        orderNumber: 'PO-1',
        linkedLineValues: { colorValues: ['Red', 'Blue'] },
      },
      meta: {
        lineColumnKey: 'color',
        lineColumnId: 44,
        lineDataType: 'text',
        lineColumnLabel: 'Color',
        writableToD365: true,
        lineColumn: LINE_COLUMN,
      },
    });
    expect(screen.getByLabelText(/write back to D365 on all lines/)).toBeTruthy();
    expect(screen.getByLabelText('1 additional unique values')).toBeTruthy();
  });
});
