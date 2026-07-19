import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { useColumnFormatRulesMenuDraft } from './useColumnFormatRulesMenuDraft';
import { useColumnTextStyleActions } from './useColumnTextStyleActions';

function useFormatRulesMenuHarness({ open, columnFormatRuleSet, onSetColumnFormatRules }) {
  return useColumnFormatRulesMenuDraft({
    open,
    columnFormatRuleSet,
    onPersist: onSetColumnFormatRules,
  });
}

describe('useColumnFormatRulesMenuDraft live persist', () => {
  it('persiste conditional formatting direct bij rule toevoegen', async () => {
    const onSetColumnFormatRules = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ open }) => useFormatRulesMenuHarness({
        open,
        columnFormatRuleSet: null,
        onSetColumnFormatRules,
      }),
      { initialProps: { open: false } },
    );

    rerender({ open: true });

    act(() => {
      result.current.addFormatRule();
    });

    await waitFor(() => {
      expect(onSetColumnFormatRules).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useColumnTextStyleActions live persist', () => {
  it('persiste text style direct bij toggle bold', async () => {
    const onSetColumnTextStyle = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useColumnTextStyleActions({
      open: true,
      columnTextStyle: null,
      canSetColumnTextStyle: true,
      onSetColumnTextStyle,
      columnKey: 'amount',
    }), {
      wrapper: ({ children }) => (
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
      ),
    });

    act(() => {
      result.current.handleToggleBold();
    });

    await waitFor(() => {
      expect(onSetColumnTextStyle).toHaveBeenCalledWith('amount', expect.objectContaining({ bold: true }));
    });
  });
});
