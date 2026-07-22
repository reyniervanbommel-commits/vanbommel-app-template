import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStatusLabelsEditor } from './useStatusLabelsEditor';

const OPTIONS = [
  { id: 'new', label: 'New', color: '#e2445c' },
  { id: 'done', label: 'Done', color: '#00c875' },
];

function conflictError(details) {
  return Object.assign(new Error('Labels in use'), {
    status: 409,
    data: { code: 'STATUS_LABELS_IN_USE', details },
  });
}

describe('useStatusLabelsEditor', () => {
  it('slaat de huidige waarde niet opnieuw op wanneer dezelfde optie wordt gekozen', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave, onUpdateOptions: vi.fn(), isAdmin: true,
    }));

    await act(async () => {
      await result.current.selection.handleSelect('New');
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('slaat een nieuwe celwaarde op en sluit de popover', async () => {
    const onSave = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave, onUpdateOptions: vi.fn(), isAdmin: true,
    }));

    await act(async () => {
      await result.current.selection.handleSelect('Done');
    });

    expect(onSave).toHaveBeenCalledWith('Done');
    expect(result.current.selection.open).toBe(false);
  });

  it('past labels toe en gaat terug naar select-mode bij een geslaagde update', async () => {
    const onUpdateOptions = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    act(() => { result.current.setMode('edit'); });
    await act(async () => {
      await result.current.editor.handleApplyOptions();
    });

    expect(onUpdateOptions).toHaveBeenCalledWith(OPTIONS, undefined);
    expect(result.current.mode).toBe('select');
  });

  it('verwijdert een label uit de draft, maar houdt minstens één label over', () => {
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: [OPTIONS[0]], onSave: vi.fn(), onUpdateOptions: vi.fn(), isAdmin: true,
    }));

    act(() => { result.current.editor.handleRemoveDraftOption(0); });

    expect(result.current.editor.draftOptions).toHaveLength(1);
  });

  it('schakelt naar de conflict-stap wanneer de backend 409 STATUS_LABELS_IN_USE teruggeeft', async () => {
    const details = [{ id: 'done', label: 'Done', count: 3 }];
    const onUpdateOptions = vi.fn().mockRejectedValueOnce(conflictError(details));
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    // 'Done' (index 1) uit de draft verwijderen — dat label is nog in gebruik.
    act(() => { result.current.editor.handleRemoveDraftOption(1); });
    await act(async () => {
      await result.current.editor.handleApplyOptions();
    });

    expect(result.current.mode).toBe('conflict');
    expect(result.current.conflict.conflicts).toEqual(details);
    expect(result.current.conflict.reassignChoices).toEqual({ Done: '' });
  });

  it('stuurt de gekozen reassign mee en verwijdert het label pas na bevestiging', async () => {
    const details = [{ id: 'done', label: 'Done', count: 3 }];
    const onUpdateOptions = vi.fn()
      .mockRejectedValueOnce(conflictError(details))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    act(() => { result.current.editor.handleRemoveDraftOption(1); });
    await act(async () => {
      await result.current.editor.handleApplyOptions();
    });
    act(() => { result.current.conflict.setReassignChoice('Done', 'New'); });
    await act(async () => {
      await result.current.conflict.handleConfirmConflict();
    });

    expect(onUpdateOptions).toHaveBeenNthCalledWith(2, [OPTIONS[0]], { Done: 'New' });
    expect(result.current.mode).toBe('select');
  });

  it('gaat terug naar edit-mode wanneer de gebruiker het conflict annuleert', async () => {
    const details = [{ id: 'done', label: 'Done', count: 3 }];
    const onUpdateOptions = vi.fn().mockRejectedValueOnce(conflictError(details));
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    act(() => { result.current.editor.handleRemoveDraftOption(1); });
    await act(async () => {
      await result.current.editor.handleApplyOptions();
    });
    act(() => { result.current.conflict.handleCancelConflict(); });

    expect(result.current.mode).toBe('edit');
    expect(result.current.conflict.conflicts).toEqual([]);
  });
});
