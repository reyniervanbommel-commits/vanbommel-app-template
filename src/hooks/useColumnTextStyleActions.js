import { useCallback, useEffect, useRef, useState } from 'react';
import { HEX_COLOR_PATTERN, getTextStyleDraft } from '../components/supplier/purchaseOrderColumnFilterMenuConstants';
import { useAppToast } from './useAppToast';

export function useColumnTextStyleActions({
  open,
  columnTextStyle,
  canSetColumnTextStyle,
  onSetColumnTextStyle,
  columnKey,
}) {
  const { notifyError } = useAppToast();
  const [textStyleDraft, setTextStyleDraft] = useState(() => getTextStyleDraft(columnTextStyle));
  const persistRequestRef = useRef(0);

  useEffect(() => {
    if (open) {
      setTextStyleDraft(getTextStyleDraft(columnTextStyle));
    }
  }, [open, columnTextStyle]);

  const persistTextStyle = useCallback(async (nextDraft) => {
    if (!canSetColumnTextStyle) return;
    const requestId = persistRequestRef.current + 1;
    persistRequestRef.current = requestId;
    try {
      await onSetColumnTextStyle(columnKey, nextDraft);
    } catch (err) {
      if (persistRequestRef.current === requestId) {
        notifyError(err?.message || 'Applying text style failed.');
      }
    }
  }, [canSetColumnTextStyle, columnKey, notifyError, onSetColumnTextStyle]);

  const handleTextColorChange = useCallback((nextColorOrEvent) => {
    const nextColor = typeof nextColorOrEvent === 'string'
      ? nextColorOrEvent
      : String(nextColorOrEvent?.target?.value || '').toLowerCase();
    setTextStyleDraft((prev) => {
      const next = {
        ...prev,
        textColor: HEX_COLOR_PATTERN.test(nextColor) ? nextColor : '',
      };
      void persistTextStyle(next);
      return next;
    });
  }, [persistTextStyle]);

  const handleToggleBold = useCallback(() => {
    setTextStyleDraft((prev) => {
      const next = { ...prev, bold: !prev.bold };
      void persistTextStyle(next);
      return next;
    });
  }, [persistTextStyle]);

  const handleToggleItalic = useCallback(() => {
    setTextStyleDraft((prev) => {
      const next = { ...prev, italic: !prev.italic };
      void persistTextStyle(next);
      return next;
    });
  }, [persistTextStyle]);

  const handleToggleUnderline = useCallback(() => {
    setTextStyleDraft((prev) => {
      const next = { ...prev, underline: !prev.underline };
      void persistTextStyle(next);
      return next;
    });
  }, [persistTextStyle]);

  const handleClearTextStyle = useCallback(async () => {
    if (!canSetColumnTextStyle) return;
    const resetValue = { textColor: '', bold: false, italic: false, underline: false };
    setTextStyleDraft(resetValue);
    try {
      await onSetColumnTextStyle(columnKey, resetValue);
    } catch (err) {
      notifyError(err?.message || 'Clearing text style failed.');
    }
  }, [canSetColumnTextStyle, columnKey, notifyError, onSetColumnTextStyle]);

  return {
    textStyleDraft,
    handleTextColorChange,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleClearTextStyle,
  };
}
