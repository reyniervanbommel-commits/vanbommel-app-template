import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderViewTabBar from './PurchaseOrderViewTabBar';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function renderBar(extraCount = 8) {
  const extraTabs = Array.from({ length: extraCount }, (_, index) => ({
    id: `tab_${index}`,
    name: `Tab ${index + 1}`,
    extraFilters: {},
  }));

  return render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderViewTabBar
        activeTabId="tab_0"
        extraTabs={extraTabs}
        groups={[]}
        canManage
        onSelectTab={vi.fn()}
        onRemoveTab={vi.fn()}
        onSetGroupColor={vi.fn()}
      />
    </FluentProvider>
  );
}

describe('PurchaseOrderViewTabBar', () => {
  it('toont geen overflow-menu met alle tabs', () => {
    renderBar(8);
    expect(screen.queryByLabelText('More tabs')).toBeNull();
    expect(screen.queryByRole('button', { name: 'More tabs' })).toBeNull();
  });

  it('toont de extra tabs in de balk', () => {
    renderBar(6);
    expect(screen.getByRole('tab', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Tab 6' })).toBeTruthy();
  });
});
