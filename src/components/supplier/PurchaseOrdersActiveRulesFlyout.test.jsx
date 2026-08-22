import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrdersActiveRulesFlyout from './PurchaseOrdersActiveRulesFlyout';

const emptyRules = { header: [], line: [] };

function renderFlyout(overrides = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    filters: emptyRules,
    formatRules: emptyRules,
    expandedKey: null,
    onToggleExpanded: vi.fn(),
    onClearFilter: vi.fn(),
    onClearFormatRules: vi.fn(),
    filterEditor: null,
    formatEditor: null,
    ...overrides,
  };

  render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrdersActiveRulesFlyout {...props} />
    </FluentProvider>
  );

  return props;
}

describe('PurchaseOrdersActiveRulesFlyout', () => {
  it('shows empty text for filters and conditional formatting', () => {
    renderFlyout();

    expect(screen.getByText('No active filters')).toBeTruthy();
    expect(screen.getByText('No conditional formatting')).toBeTruthy();
  });

  it('shows a header filter and clears it', () => {
    const filterItem = {
      id: 'header:vendor',
      columnKey: 'vendor',
      columnLabel: 'Vendor',
      scope: 'header',
      column: { key: 'vendor', label: 'Vendor' },
      summary: 'contains Acme',
      filter: { operator: 'contains', value: 'Acme' },
    };
    const onClearFilter = vi.fn();

    renderFlyout({
      filters: { header: [filterItem], line: [] },
      onClearFilter,
    });

    expect(screen.getByText('Vendor')).toBeTruthy();
    expect(screen.getByText('contains Acme')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClearFilter).toHaveBeenCalledWith(filterItem);
  });
});
