import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePurchaseOrdersBoardTableProps } from './usePurchaseOrdersBoardTableProps';

describe('usePurchaseOrdersBoardTableProps', () => {
  it('groups board state into the six board-table contracts', () => {
    const pageState = {
      orders: [{ orderNumber: 'PO-1' }],
      visibleHeaderColumns: [{ key: 'status' }],
      lineColumns: [{ key: 'itemNumber' }],
      headerColumnWidths: {},
      lineColumnWidths: {},
      headerColumnTextStyles: {},
      headerColumnFormatRules: {},
      lineColumnTextStyles: {},
      lineColumnFormatRules: {},
      lineTotalColumns: [],
      lineTotalHeaderLinks: [],
      lineValueHeaderLinks: [],
      toggleWriteback: vi.fn(),
      reorderHeaderColumn: vi.fn(),
      reorderLineColumn: vi.fn(),
      renameColumn: vi.fn(),
      removeColumn: vi.fn(),
      saveHeaderColumnWidth: vi.fn(),
      saveLineColumnWidth: vi.fn(),
      saveHeaderColumnTextStyle: vi.fn(),
      saveHeaderColumnFormatRules: vi.fn(),
      saveLineColumnTextStyle: vi.fn(),
      saveLineColumnFormatRules: vi.fn(),
      savingColumns: false,
      setLineColumnTotal: vi.fn(),
    };
    const args = {
      pageState,
      boardView: { processedItems: pageState.orders },
      bulkEdit: { handleSaveValue: vi.fn(), handleCorrectField: vi.fn() },
      isAdmin: true,
      onAddColumnRightOf: vi.fn(),
      onPushLineTotalToHeader: vi.fn(),
      onPushLineValuesToHeader: vi.fn(),
      editingColumnKey: 'status',
      onEditingDone: vi.fn(),
      tableSelection: { enabled: true },
      stickyColumnKeys: ['status'],
      setStickyColumnKeys: vi.fn(),
    };
    const { result } = renderHook(() => usePurchaseOrdersBoardTableProps(args));

    expect(Object.keys(result.current)).toEqual([
      'boardData',
      'columnConfig',
      'cellActions',
      'columnActions',
      'interactionState',
      'selection',
    ]);
    expect(result.current.boardData.items).toBe(pageState.orders);
    expect(result.current.boardData.columns[0].key).toBe('__productImage');
    expect(result.current.boardData.lineColumns[0].key).toBe('__productImage');
    expect(result.current.interactionState.stickyColumns.keys).toEqual(['status']);
  });
});
