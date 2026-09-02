// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';

function renderHeader(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderColumnHeader
        column={{ id: 1, key: 'colorValues', label: 'Color Values', source: 'custom' }}
        onRename={() => {}}
        onRemove={() => {}}
        isAdmin
        showActionsMenu={false}
        {...props}
      />
    </FluentProvider>
  );
}

describe('PurchaseOrderColumnHeader', () => {
  it('hides the D365 write-back icon on a custom column by default', () => {
    renderHeader();
    expect(screen.queryByLabelText('Write-back to D365 enabled')).toBeNull();
  });

  it('shows the D365 write-back icon on a pushed writable header column', () => {
    renderHeader({ showWriteBackIcon: true });
    expect(screen.getByLabelText('Write-back to D365 enabled')).toBeTruthy();
  });
});
