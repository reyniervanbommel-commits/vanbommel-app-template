import { useCallback, useMemo } from 'react';

/**
 * Veldhandlers voor RCCP-settings. De view rendert; deze hook levert alleen callbacks.
 * @param {{ thresholds?: { greenMax?: number, orangeMax?: number } } | null} config
 * @param {(field: string, value: unknown) => void} onUpdateField
 */
export function useRccpSettingsFormHandlers(config, onUpdateField) {
  const handleVendor = useCallback((e) => {
    onUpdateField('vendorColumnKey', e.target.value);
  }, [onUpdateField]);

  const handleDate = useCallback((e) => {
    onUpdateField('dateColumnKey', e.target.value);
  }, [onUpdateField]);

  const handleReceiptDate = useCallback((e) => {
    onUpdateField('receiptDateColumnKey', e.target.value);
  }, [onUpdateField]);

  const handleMeasures = useCallback((quantityMeasures) => {
    onUpdateField('quantityMeasures', quantityMeasures);
  }, [onUpdateField]);

  const handleRanges = useCallback((chartWeekRanges) => {
    onUpdateField('chartWeekRanges', chartWeekRanges);
  }, [onUpdateField]);

  const handleStatuses = useCallback((e) => {
    onUpdateField(
      'excludedStatuses',
      e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
    );
  }, [onUpdateField]);

  const handleGreen = useCallback((e) => {
    onUpdateField('thresholds', { ...config?.thresholds, greenMax: Number(e.target.value) });
  }, [config, onUpdateField]);

  const handleOrange = useCallback((e) => {
    onUpdateField('thresholds', { ...config?.thresholds, orangeMax: Number(e.target.value) });
  }, [config, onUpdateField]);

  const handlePolicy = useCallback((e) => {
    onUpdateField('duplicatePolicy', e.target.value);
  }, [onUpdateField]);

  const handleItemPickerColumns = useCallback((itemPickerColumnKeys) => {
    onUpdateField('itemPickerColumnKeys', itemPickerColumnKeys);
  }, [onUpdateField]);

  return useMemo(() => ({
    handleVendor,
    handleDate,
    handleReceiptDate,
    handleMeasures,
    handleRanges,
    handleStatuses,
    handleGreen,
    handleOrange,
    handlePolicy,
    handleItemPickerColumns,
  }), [
    handleVendor, handleDate, handleReceiptDate, handleMeasures, handleRanges,
    handleStatuses, handleGreen, handleOrange, handlePolicy, handleItemPickerColumns,
  ]);
}
