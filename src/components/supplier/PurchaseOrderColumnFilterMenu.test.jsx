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

  it('toont Connected type voor gelinkte value-headerkolommen', async () => {
    renderMenu({ isConnectedType: true });
    openColumnMenu();
    const typeLabel = await screen.findByTestId('column-type-label');
    expect(typeLabel.textContent).toBe('Connected');
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
  });

  it('slaagt regels op via onSetColumnFormatRules bij Apply', async () => {
    const { onSetColumnFormatRules } = renderMenu();

    openColumnMenu();
    const submenuButtons = await screen.findAllByRole('button', { name: /Conditional formatting/i });
    fireEvent.click(submenuButtons[submenuButtons.length - 1]);
    const applyButtons = screen.getAllByRole('button', { name: /^Apply$/i });
    fireEvent.click(applyButtons[applyButtons.length - 1]);

    await waitFor(() => {
      expect(onSetColumnFormatRules).toHaveBeenCalledTimes(1);
    });
    expect(onSetColumnFormatRules.mock.calls[0][0]).toBe('amount');
  });

  it('toont group header sum toggle voor number header-kolommen', async () => {
    const onSetGroupSummaryColumn = vi.fn();
    renderMenu({ onSetGroupSummaryColumn });

    openColumnMenu();
    fireEvent.click(await screen.findByRole('button', { name: /Categorie \/ groeperen/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Show sum in group header/i }));

    expect(onSetGroupSummaryColumn).toHaveBeenCalledWith('amount', true);
  });
});
