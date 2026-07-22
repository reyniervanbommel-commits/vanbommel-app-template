// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import PurchaseOrderLinkedValueCell from './PurchaseOrderLinkedValueCell';

function renderCell(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderLinkedValueCell {...props} />
    </FluentProvider>
  );
}

describe('PurchaseOrderLinkedValueCell', () => {
  it('renders only the first value when there is nothing additional', () => {
    renderCell({ firstValue: 'ITEM-1', additionalCount: 0, allValuesLabel: 'ITEM-1' });

    expect(screen.getByText('ITEM-1')).toBeTruthy();
    expect(screen.queryByText('+0')).toBeNull();
  });

  it('shows a "+N" badge when there are additional unique values', () => {
    renderCell({ firstValue: 'ITEM-1', additionalCount: 2, allValuesLabel: 'ITEM-1, ITEM-2, ITEM-3' });

    expect(screen.getByText('ITEM-1')).toBeTruthy();
    const badge = screen.getByLabelText('2 additional unique values');
    expect(badge.textContent).toBe('+2');
  });
});
