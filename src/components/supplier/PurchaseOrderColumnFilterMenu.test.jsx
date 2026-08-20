import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';

const COLUMN = {
  id: 'amount-id',
  key: 'amount',
  label: 'Amount',
  dataType: 'number',
  source: 'd365',
  level: 'header',
};

function renderMenu(overrides = {}) {
  const onSetColumnFormatRules = vi.fn().mockResolvedValue(undefined);
  const props = {
    column: COLUMN,
    filter: null,
    sortState: { columnKey: '', direction: 'none' },
    groupingColumnKey: '',
    groupingColor: '#f4e6ed',
    onSetSortDirection: vi.fn(),
    onSetOperator: vi.fn(),
    onSetValue: vi.fn(),
    onSetSecondaryValue: vi.fn(),
    onClearFilter: vi.fn(),
    onSetGroupingColumn: vi.fn(),
    onClearGrouping: vi.fn(),
    onSetGroupingColor: vi.fn(),
    columnFormatRuleSet: null,
    onSetColumnFormatRules,
    onSetColumnTextStyle: vi.fn().mockResolvedValue(undefined),
    referenceColumns: [
      { key: 'amount', label: 'Amount' },
      { key: 'budget', label: 'Budget' },
    ],
    ...overrides,
  };

  render(
    <FluentProvider theme={webLightTheme}>
      <PurchaseOrderColumnFilterMenu {...props} />
    </FluentProvider>
  );

  return { onSetColumnFormatRules, props };
}

function openColumnMenu() {
  const trigger = document.querySelector('[data-column-menu-trigger="true"]');
  expect(trigger).toBeTruthy();
  fireEvent.click(trigger);
}

describe('PurchaseOrderColumnFilterMenu conditional formatting', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('toont Conditional formatting in het kolommenu', async () => {
    renderMenu();
    openColumnMenu();
    const items = await screen.findAllByRole('button', { name: /Conditional formatting/i });
    expect(items.length).toBeGreaterThan(0);
  });

  it('toont kolomtype in de menu-titel', async () => {
    renderMenu();
    openColumnMenu();
    const typeLabel = await screen.findByTestId('column-type-label');
    expect(typeLabel.textContent).toBe('Number');
  });

  it('toont kolomtype rechts en bron links voor gelinkte value-headerkolommen', async () => {
    renderMenu({ isConnectedType: true });
    openColumnMenu();
    const typeLabel = await screen.findByTestId('column-type-label');
    expect(typeLabel.textContent).toBe('Number');
  });

  it('maakt de kolomnaam klikbaar voor hernoemen (ook d365)', async () => {
    const onRenameColumn = vi.fn().mockResolvedValue(undefined);
    renderMenu({ onRenameColumn });
    openColumnMenu();
    fireEvent.click(await screen.findByRole('button', { name: /Rename column Amount/i }));
    expect(await screen.findByText('Rename column')).toBeTruthy();
  });

  it('opent het regels-submenu met de beheeractie', async () => {
    renderMenu();
    openColumnMenu();
    const submenuButtons = await screen.findAllByRole('button', { name: /Conditional formatting/i });
    fireEvent.click(submenuButtons[submenuButtons.length - 1]);

    expect(await screen.findByRole('button', { name: /Manage formatting rules/i })).toBeTruthy();
  });

  it('opent een submenu wanneer de gebruiker erover hovert', async () => {
    renderMenu();
    openColumnMenu();
    const textStyleButton = await screen.findByRole('button', { name: /Text style/i });
    fireEvent.mouseEnter(textStyleButton);

    expect(await screen.findByText('Preview text')).toBeTruthy();
    expect(document.querySelector('[data-flyout-side]')).toBeTruthy();
  });

  it('klapt het submenu naar links als rechts geen ruimte is', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect() {
      if (this.getAttribute?.('data-flyout-side') != null) {
        return { width: 240, height: 220, top: 80, left: 1100, right: 1340, bottom: 300, x: 1100, y: 80, toJSON() {} };
      }
      if (this.getAttribute?.('data-column-menu-surface') != null) {
        return { width: 256, height: 480, top: 40, left: 844, right: 1100, bottom: 520, x: 844, y: 40, toJSON() {} };
      }
      return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} };
    });

    renderMenu();
    openColumnMenu();
    fireEvent.mouseEnter(await screen.findByRole('button', { name: /Text style/i }));

    await waitFor(() => {
      expect(document.querySelector('[data-flyout-side="left"]')).toBeTruthy();
    });
  });

  it('sluit het submenu wanneer de gebruiker over een item zonder submenu hovert', async () => {
    renderMenu();
    openColumnMenu();
    const textStyleButton = await screen.findByRole('button', { name: /Text style/i });
    fireEvent.mouseEnter(textStyleButton);
    expect(await screen.findByText('Preview text')).toBeTruthy();

    const sortButton = await screen.findByRole('button', { name: /Sort ascending/i });
    fireEvent.mouseEnter(sortButton);

    await waitFor(() => {
      expect(screen.queryByText('Preview text')).toBeNull();
    });
  });

  it('past text style direct op bij toggle bold', async () => {
    const onSetColumnTextStyle = vi.fn().mockResolvedValue(undefined);
    renderMenu({ onSetColumnTextStyle });

    openColumnMenu();
    fireEvent.mouseEnter(await screen.findByRole('button', { name: /Text style/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Toggle bold/i }));

    await waitFor(() => {
      expect(onSetColumnTextStyle).toHaveBeenCalledWith('amount', expect.objectContaining({ bold: true }));
    });
  });

  it('past conditional formatting direct op bij rule toevoegen', async () => {
    const { onSetColumnFormatRules } = renderMenu();

    openColumnMenu();
    const submenuButtons = await screen.findAllByRole('button', { name: /Conditional formatting/i });
    fireEvent.click(submenuButtons[submenuButtons.length - 1]);
    fireEvent.click(await screen.findByRole('button', { name: /Manage formatting rules/i }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ Add rule/i }));

    await waitFor(() => {
      expect(onSetColumnFormatRules).toHaveBeenCalledTimes(1);
    });
    expect(onSetColumnFormatRules.mock.calls[0][0]).toBe('amount');
  });

  it('toont group header sum toggle voor number header-kolommen', async () => {
    const onSetGroupSummaryColumn = vi.fn();
    renderMenu({ onSetGroupSummaryColumn });

    openColumnMenu();
    fireEvent.click(await screen.findByRole('button', { name: /Category \/ group/i }));
    fireEvent.click(await screen.findByRole('switch', { name: /Show sum in group header/i }));

    expect(onSetGroupSummaryColumn).toHaveBeenCalledWith('amount', true);
  });

  it('gebruikt palette picker voor category bar color', async () => {
    const onSetGroupingColor = vi.fn();
    renderMenu({ onSetGroupingColor, groupingColor: '#f4e6ed' });

    openColumnMenu();
    fireEvent.click(await screen.findByRole('button', { name: /Category \/ group/i }));
    fireEvent.click(await screen.findByRole('option', { name: /Pick color #00c875/i }));

    expect(onSetGroupingColor).toHaveBeenCalledWith('amount', '#00c875');
  });

  it('verbergt Conditional formatting voor image-kolommen', async () => {
    renderMenu({
      column: { ...COLUMN, dataType: 'image', source: 'custom' },
    });

    openColumnMenu();
    expect(screen.queryAllByRole('button', { name: /Conditional formatting/i }).length).toBe(0);
  });

  it('verbergt niet-ondersteunde acties voor de vaste Remarks-kolom', async () => {
    renderMenu({
      column: { ...COLUMN, key: 'remarks', label: 'Remarks', dataType: 'remarks', source: 'custom' },
      onRenameColumn: vi.fn(),
      onRemoveColumn: vi.fn(),
    });

    openColumnMenu();
    expect((await screen.findByTestId('column-type-label')).textContent).toBe('Remarks');
    expect(screen.queryByRole('button', { name: /Rename column Remarks/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Conditional formatting/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Text style/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Sort ascending/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Delete column/i }).disabled).toBe(false);
  });

  it('past filter operator en waarde pas op bij Apply', async () => {
    const onApplyFilter = vi.fn();
    renderMenu({ onApplyFilter });
    openColumnMenu();
    fireEvent.click(await screen.findByRole('button', { name: /Filter operator for Amount/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'is greater than' }));
    expect(onApplyFilter).not.toHaveBeenCalled();

    const valueInput = await screen.findByLabelText(/Filter value for Amount/i);
    fireEvent.change(valueInput, { target: { value: '45' } });
    fireEvent.click(await screen.findByRole('button', { name: /^Apply$/i }));

    await waitFor(() => {
      expect(onApplyFilter).toHaveBeenCalledWith('amount', {
        operator: 'gt',
        value: '45',
        secondaryValue: expect.anything(),
      });
    });
  });

  it('toont Hide column in het kolommenu', async () => {
    const onToggleColumnCollapsed = vi.fn();
    renderMenu({ onToggleColumnCollapsed });
    openColumnMenu();
    const hideButton = await screen.findByRole('button', { name: /Hide column/i });
    expect(hideButton).toBeTruthy();
    fireEvent.click(hideButton);
    expect(onToggleColumnCollapsed).toHaveBeenCalledWith('amount');
  });
});

describe('PurchaseOrderColumnFilterMenu — unieke waarden', () => {
  it('berekent uniqueColumnValues pas nadat de popover is geopend', async () => {
    const items = [
      { values: { amount: 100 } },
      { values: { amount: 250 } },
      { values: { amount: 100 } },
    ];
    renderMenu({ items, filter: { operator: 'oneOf', value: [] } });
    openColumnMenu();
    const input = await screen.findByLabelText(/Filter value for Amount/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1' } });
    const suggestion = await screen.findByRole('option', { name: '100' });
    expect(suggestion).toBeTruthy();
  });
});

describe('PurchaseOrderColumnFilterMenu — value picker wiring', () => {
  it('toont de picker (met chips) voor oneOf op een tekstkolom', async () => {
    renderMenu({
      column: { key: 'vendor', label: 'Vendor', dataType: 'text' },
      filter: { operator: 'oneOf', value: ['Acme'] },
    });
    openColumnMenu();
    expect(await screen.findByText('Acme')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Remove Acme/i })).toBeTruthy();
  });

  it('toont een plain input voor contains (ongewijzigd)', async () => {
    renderMenu({
      column: { key: 'vendor', label: 'Vendor', dataType: 'text' },
      filter: { operator: 'contains', value: 'Ac' },
    });
    openColumnMenu();
    const input = await screen.findByLabelText(/Filter value for Vendor/i);
    expect(input).toHaveValue('Ac');
  });

  it('toont de single-value picker voor equals op een number-kolom', async () => {
    renderMenu({ filter: { operator: 'equals', value: '100' } });
    openColumnMenu();
    const input = await screen.findByLabelText(/Filter value for Amount/i);
    expect(input).toHaveValue('100');
  });
});
