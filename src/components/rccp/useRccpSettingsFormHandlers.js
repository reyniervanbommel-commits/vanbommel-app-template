import { useCallback, useMemo } from 'react';

/**
 * Display- en quantity-handlers voor RCCP-settings. Data-tab praat direct met onUpdateField.
 * @param {{ thresholds?: { greenMax?: number, orangeMax?: number } } | null} config
 * @param {(field: string, value: unknown) => void} onUpdateField
 */
export function useRccpSettingsFormHandlers(config, onUpdateField) {
  const handleMeasures = useCallback((quantityMeasures) => {
    onUpdateField('quantityMeasures', quantityMeasures);
  }, [onUpdateField]);

  const handleRanges = useCallback((chartWeekRanges) => {
    onUpdateField('chartWeekRanges', chartWeekRanges);
  }, [onUpdateField]);

  const handleGreen = useCallback((e) => {
    onUpdateField('thresholds', { ...config?.thresholds, greenMax: Number(e.target.value) });
  }, [config, onUpdateField]);

  const handleOrange = useCallback((e) => {
    onUpdateField('thresholds', { ...config?.thresholds, orangeMax: Number(e.target.value) });
  }, [config, onUpdateField]);

  const handleItemPickerColumns = useCallback((itemPickerColumnKeys) => {
    onUpdateField('itemPickerColumnKeys', itemPickerColumnKeys);
  }, [onUpdateField]);

  return useMemo(() => ({
    handleMeasures,
    handleRanges,
    handleGreen,
    handleOrange,
    handleItemPickerColumns,
  }), [
    handleMeasures, handleRanges, handleGreen, handleOrange, handleItemPickerColumns,
  ]);
}
