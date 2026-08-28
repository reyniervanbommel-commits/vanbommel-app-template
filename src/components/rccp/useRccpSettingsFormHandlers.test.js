import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRccpSettingsFormHandlers } from './useRccpSettingsFormHandlers';

describe('useRccpSettingsFormHandlers', () => {
  it('zet excluded statuses om naar een schone lijst', () => {
    const onUpdateField = vi.fn();
    const { result } = renderHook(() => useRccpSettingsFormHandlers({ thresholds: {} }, onUpdateField));
    result.current.handleStatuses({ target: { value: 'Canceled,  Invoiced , ' } });
    expect(onUpdateField).toHaveBeenCalledWith('excludedStatuses', ['Canceled', 'Invoiced']);
  });

  it('zet de receipt-date kolom via handleReceiptDate', () => {
    const onUpdateField = vi.fn();
    const { result } = renderHook(() => useRccpSettingsFormHandlers({ thresholds: {} }, onUpdateField));
    result.current.handleReceiptDate({ target: { value: 'productReceiptDate' } });
    expect(onUpdateField).toHaveBeenCalledWith('receiptDateColumnKey', 'productReceiptDate');
  });

  it('houdt de andere drempel vast bij een groene drempelwijziging', () => {
    const onUpdateField = vi.fn();
    const { result } = renderHook(() => (
      useRccpSettingsFormHandlers({ thresholds: { greenMax: 80, orangeMax: 100 } }, onUpdateField)
    ));
    result.current.handleGreen({ target: { value: '70' } });
    expect(onUpdateField).toHaveBeenCalledWith('thresholds', { greenMax: 70, orangeMax: 100 });
  });

  it('zet item-picker kolommen via handleItemPickerColumns', () => {
    const onUpdateField = vi.fn();
    const { result } = renderHook(() => useRccpSettingsFormHandlers({ thresholds: {} }, onUpdateField));
    result.current.handleItemPickerColumns(['productName', 'color']);
    expect(onUpdateField).toHaveBeenCalledWith('itemPickerColumnKeys', ['productName', 'color']);
  });
});
