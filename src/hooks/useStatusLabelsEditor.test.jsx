import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStatusLabelsEditor } from './useStatusLabelsEditor';

const notifyError = vi.fn();
vi.mock('./useAppToast', () => ({
  useAppToast: () => ({ notify: vi.fn(), notifyError, notifySuccess: vi.fn() }),
}));

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

  it('voegt een label direct toe zonder apply-stap (optimistic)', async () => {
    const onUpdateOptions = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    act(() => { result.current.setMode('edit'); });
    act(() => { result.current.editor.setNewLabel('Blocked'); });
    await act(async () => {
      await result.current.editor.handleAddLabel();
    });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      [...OPTIONS, expect.objectContaining({ label: 'Blocked' })],
      undefined,
    );
    expect(result.current.editor.draftOptions).toHaveLength(3);
  });

  it('verwijdert een label direct zonder apply-stap (optimistic)', async () => {
    const onUpdateOptions = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    await act(async () => {
      await result.current.editor.handleRemoveDraftOption(1);
    });

    expect(result.current.editor.draftOptions).toEqual([OPTIONS[0]]);
    expect(onUpdateOptions).toHaveBeenCalledWith([OPTIONS[0]], undefined);
  });

  it('houdt minstens één label over en verwijdert niet het laatste label', async () => {
    const onUpdateOptions = vi.fn();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: [OPTIONS[0]], onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    await act(async () => {
      await result.current.editor.handleRemoveDraftOption(0);
    });

    expect(result.current.editor.draftOptions).toHaveLength(1);
    expect(onUpdateOptions).not.toHaveBeenCalled();
  });

  it('past een label direct toe zodra het veld de focus verliest', async () => {
    const onUpdateOptions = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    act(() => { result.current.editor.handleLabelInputChange('new', 'Renamed'); });
    await act(async () => {
      await result.current.editor.commitLabelEdit('new');
    });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      [{ ...OPTIONS[0], label: 'Renamed' }, OPTIONS[1]],
      undefined,
    );
    expect(result.current.editor.draftOptions[0].label).toBe('Renamed');
  });

  it('weigert een leeg label en behoudt de vorige waarde', async () => {
    const onUpdateOptions = vi.fn();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    act(() => { result.current.editor.handleLabelInputChange('new', '   '); });
    await act(async () => {
      await result.current.editor.commitLabelEdit('new');
    });

    expect(onUpdateOptions).not.toHaveBeenCalled();
    expect(result.current.editor.draftOptions[0].label).toBe('New');
  });

  it('past de kleur van een label direct toe', async () => {
    const onUpdateOptions = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    await act(async () => {
      await result.current.editor.handleColorChange(0, '#123456');
    });

    expect(onUpdateOptions).toHaveBeenCalledWith(
      [{ ...OPTIONS[0], color: '#123456' }, OPTIONS[1]],
      undefined,
    );
    expect(result.current.editor.draftOptions[0].color).toBe('#123456');
  });

  it('schakelt naar de conflict-stap wanneer de backend 409 STATUS_LABELS_IN_USE teruggeeft, en draait de optimistische verwijdering terug', async () => {
    const details = [{ id: 'done', label: 'Done', count: 3 }];
    const onUpdateOptions = vi.fn().mockRejectedValueOnce(conflictError(details));
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    // 'Done' (index 1) uit de draft verwijderen — dat label is nog in gebruik.
    await act(async () => {
      await result.current.editor.handleRemoveDraftOption(1);
    });

    expect(result.current.mode).toBe('conflict');
    expect(result.current.conflict.conflicts).toEqual(details);
    expect(result.current.conflict.reassignChoices).toEqual({ Done: '' });
    expect(result.current.editor.draftOptions).toEqual(OPTIONS);
  });

  it('stuurt de gekozen reassign mee en verwijdert het label pas na bevestiging', async () => {
    const details = [{ id: 'done', label: 'Done', count: 3 }];
    const onUpdateOptions = vi.fn()
      .mockRejectedValueOnce(conflictError(details))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    await act(async () => {
      await result.current.editor.handleRemoveDraftOption(1);
    });
    act(() => { result.current.conflict.setReassignChoice('Done', 'New'); });
    await act(async () => {
      await result.current.conflict.handleConfirmConflict();
    });

    expect(onUpdateOptions).toHaveBeenNthCalledWith(2, [OPTIONS[0]], { Done: 'New' });
    expect(result.current.mode).toBe('edit');
    expect(result.current.editor.draftOptions).toEqual([OPTIONS[0]]);
  });

  it('gaat terug naar edit-mode wanneer de gebruiker het conflict annuleert', async () => {
    const details = [{ id: 'done', label: 'Done', count: 3 }];
    const onUpdateOptions = vi.fn().mockRejectedValueOnce(conflictError(details));
    const { result } = renderHook(() => useStatusLabelsEditor({
      value: 'New', options: OPTIONS, onSave: vi.fn(), onUpdateOptions, isAdmin: true,
    }));

    await act(async () => {
      await result.current.editor.handleRemoveDraftOption(1);
    });
    act(() => { result.current.conflict.handleCancelConflict(); });

    expect(result.current.mode).toBe('edit');
    expect(result.current.conflict.conflicts).toEqual([]);
    expect(result.current.editor.draftOptions).toEqual(OPTIONS);
  });
});
