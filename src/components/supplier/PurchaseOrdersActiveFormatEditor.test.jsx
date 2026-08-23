import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrdersActiveFormatEditor from './PurchaseOrdersActiveFormatEditor';

vi.mock('../../hooks/useAppToast', () => ({
  useAppToast: () => ({ notifyError: vi.fn() }),
}));

function renderEditor(overrides = {}) {
  const props = {
    item: {
      columnKey: 'status',
      scope: 'header',
      ruleSet: {
        target: 'row',
        rules: [{ op: '=', value: 'Open', color: '#fde7e9' }],
      },
    },
    referenceColumns: [
      { key: 'status', label: 'Status' },
      { key: 'vendor', label: 'Vendor' },
    ],
    onSetColumnFormatRules: vi.fn(),
    ...overrides,
  };

  render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrdersActiveFormatEditor {...props} />
    </FluentProvider>
  );

  return props;
}

describe('PurchaseOrdersActiveFormatEditor', () => {
  it('mounts the conditional formatting section for an active rule', () => {
    const props = renderEditor();

    expect(screen.getByText('Conditional formatting')).toBeTruthy();
    expect(screen.getByText('1 rule(s) configured - target: row')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Manage formatting rules' }));

    expect(screen.getByText('Target')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Target' })).toBeTruthy();
    expect(screen.getByText('Row')).toBeTruthy();
    expect(props.onSetColumnFormatRules).not.toHaveBeenCalled();
  });
});
