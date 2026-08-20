import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('rccpSettingsSync', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('notifies saved listeners only after publishRccpSettingsSaved', async () => {
    const {
      publishRccpSettingsSync,
      publishRccpSettingsSaved,
      subscribeRccpSettingsSaved,
      subscribeRccpSettingsSync,
    } = await import('./rccpSettingsSync');

    const sync = vi.fn();
    const saved = vi.fn();
    const unsubSync = subscribeRccpSettingsSync(sync);
    const unsubSaved = subscribeRccpSettingsSaved(saved);

    const loaded = { quantityMeasures: [{ columnKey: 'quantity', chartType: 'line' }] };
    publishRccpSettingsSync(loaded);
    expect(sync).toHaveBeenCalledWith(loaded);
    expect(saved).not.toHaveBeenCalled();

    const stored = { quantityMeasures: [{ columnKey: 'quantity', chartType: 'bar' }] };
    publishRccpSettingsSaved(stored);
    expect(sync).toHaveBeenCalledWith(stored);
    expect(saved).toHaveBeenCalledWith(stored);

    unsubSync();
    unsubSaved();
  });
});
