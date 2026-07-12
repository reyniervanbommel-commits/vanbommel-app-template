import { useCallback, useEffect, useState } from 'react';
import { HEX_COLOR_PATTERN, getTextStyleDraft } from '../components/supplier/purchaseOrderColumnFilterMenuConstants';
import { useAppToast } from './useAppToast';

export function useColumnTextStyleActions({
  open,
  columnTextStyle,
  canSetColumnTextStyle,
  onSetColumnTextStyle,
  columnKey,
  onClose,
}) {
  const { notifyError } = useAppToast();
  const [textStyleDraft, setTextStyleDraft] = useState(() => getTextStyleDraft(columnTextStyle));

  useEffect(() => {
    if (open) {
      setTextStyleDraft(getTextStyleDraft(columnTextStyle));
    }
  }, [open, columnTextStyle]);

  const handleTextColorChange = useCallback((event) => {
    const nextColor = String(event.target.value || '').toLowerCase();
    setTextStyleDraft((prev) => ({ ...prev, textColor: HEX_COLOR_PATTERN.test(nextColor) ? nextColor : '' }));
  }, []);

  const handleToggleBold = useCallback(() => {
    setTextStyleDraft((prev) => ({ ...prev, bold: !prev.bold }));
  }, []);

  const handleToggleItalic = useCallback(() => {
    setTextStyleDraft((prev) => ({ ...prev, italic: !prev.italic }));
  }, []);

  const handleToggleUnderline = useCallback(() => {
    setTextStyleDraft((prev) => ({ ...prev, underline: !prev.underline }));
  }, []);

  const handleApplyTextStyle = useCallback(async () => {
    if (!canSetColumnTextStyle) return;
    try {
      await onSetColumnTextStyle(columnKey, textStyleDraft);
      onClose();
    } catch (err) {
      notifyError(err?.message || 'Applying text style failed.');
    }
  }, [canSetColumnTextStyle, onSetColumnTextStyle, columnKey, textStyleDraft, onClose, notifyError]);

  const handleClearTextStyle = useCallback(async () => {
    if (!canSetColumnTextStyle) return;
    const resetValue = { textColor: '', bold: false, italic: false, underline: false };
    try {
      await onSetColumnTextStyle(columnKey, resetValue);
      setTextStyleDraft(resetValue);
      onClose();
    } catch (err) {
      notifyError(err?.message || 'Clearing text style failed.');
    }
  }, [canSetColumnTextStyle, onSetColumnTextStyle, columnKey, onClose, notifyError]);

  return {
    textStyleDraft,
    handleTextColorChange,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleApplyTextStyle,
    handleClearTextStyle,
  };
}
