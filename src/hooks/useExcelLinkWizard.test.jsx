import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useExcelLinkWizard } from './useExcelLinkWizard';
import { apiRequest } from '../utils/api';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

const TABLE = { tableKey: 'purchase-orders', columns: { master: [{ key: 'poNumber' }], detail: [] } };
const LINK = { id: 1, label: 'Existing link' };

function mockReference({ tables = [TABLE], links = [LINK] } = {}) {
  apiRequest.mockImplementation((path) => {
    if (path.endsWith('/main-tables')) return Promise.resolve({ tables });
    if (path.endsWith('/links')) return Promise.resolve({ links });
    return Promise.reject(new Error(`Unexpected apiRequest path: ${path}`));
  });
}

async function renderReadyWizard() {
  mockReference();
  const view = renderHook(() => useExcelLinkWizard());
  await waitFor(() => expect(view.result.current.refLoading).toBe(false));
  apiRequest.mockClear();
  return view;
}

beforeEach(() => {
  apiRequest.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useExcelLinkWizard — referentiedata', () => {
  it('laadt main-tables en links bij mount', async () => {
    const { result } = await (async () => {
      mockReference();
      const view = renderHook(() => useExcelLinkWizard());
      await waitFor(() => expect(view.result.current.refLoading).toBe(false));
      return view;
    })();

    expect(result.current.mainTables).toEqual([TABLE]);
    expect(result.current.links).toEqual([LINK]);
    expect(result.current.refError).toBe('');
  });

  it('zet refError als het laden van referentiedata mislukt', async () => {
    apiRequest.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useExcelLinkWizard());

    await waitFor(() => expect(result.current.refLoading).toBe(false));
    expect(result.current.refError).toBe('network down');
  });
});

describe('useExcelLinkWizard — upload (stap 1)', () => {
  it('uploadt het bestand via een rauwe fetch met FormData en reset afgeleide stap-3/4-state', async () => {
    const { result } = await renderReadyWizard();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dataset: { tableKey: 'ds-1', columns: ['a', 'b'] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      await result.current.uploadFile({ name: 'file.xlsx' }, 'My upload');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/data-links/datasets', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    expect(result.current.dataset).toEqual({ tableKey: 'ds-1', columns: ['a', 'b'] });
    expect(result.current.uploading).toBe(false);
    expect(result.current.uploadError).toBe('');
  });

  it('zet uploadError bij een niet-ok response, zonder het dataset te wijzigen', async () => {
    const { result } = await renderReadyWizard();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Bad file' }) }));

    await act(async () => {
      await result.current.uploadFile({ name: 'file.xlsx' }, 'label');
    });

    expect(result.current.uploadError).toBe('Bad file');
    expect(result.current.dataset).toBeNull();
  });

  it('doet niets zonder bestand', async () => {
    const { result } = await renderReadyWizard();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      await result.current.uploadFile(null, 'label');
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useExcelLinkWizard — kolomkeuze (stap 3)', () => {
  it('toggleColumn voegt/verwijdert kolommen en zet een default afgeleide key', async () => {
    const { result } = await renderReadyWizard();

    act(() => result.current.toggleColumn('sourceCol', 'sourceCol'));
    expect(result.current.selectedColumns.has('sourceCol')).toBe(true);
    expect(result.current.derivedKeys.sourceCol).toBe('sourceCol');

    act(() => result.current.toggleColumn('sourceCol', 'sourceCol'));
    expect(result.current.selectedColumns.has('sourceCol')).toBe(false);
  });

  it('setDerivedKey overschrijft de afgeleide key, fieldsMap volgt de laatste waarde', async () => {
    const { result } = await renderReadyWizard();

    act(() => result.current.toggleColumn('sourceCol', 'sourceCol'));
    act(() => result.current.setDerivedKey('sourceCol', 'customKey'));

    expect(result.current.derivedKeys.sourceCol).toBe('customKey');
    expect(result.current.fieldsMap).toEqual({ customKey: 'sourceCol' });
  });
});

describe('useExcelLinkWizard — validatie en publiceren (stap 4)', () => {
  async function setupReadyToValidate(view) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dataset: { tableKey: 'ds-1' } }) }));
    await act(async () => { await view.result.current.uploadFile({ name: 'f.xlsx' }, 'l'); });
    act(() => view.result.current.setMainTableKey('purchase-orders'));
    act(() => view.result.current.setMainKeyField('poNumber'));
    act(() => view.result.current.setDatasetKeyField('poNumber'));
  }

  it('validate() doet niets zolang de vereiste velden ontbreken', async () => {
    const view = await renderReadyWizard();

    await act(async () => { await view.result.current.validate(); });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('validate() roept de validate-endpoint aan zodra alle velden gekozen zijn en zet het resultaat', async () => {
    const view = await renderReadyWizard();
    await setupReadyToValidate(view);
    apiRequest.mockResolvedValue({ valid: true, matched: 3 });

    await act(async () => { await view.result.current.validate(); });

    expect(apiRequest).toHaveBeenCalledWith('/data-links/validate', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ mainTableKey: 'purchase-orders', datasetKeyField: 'poNumber' }),
    }));
    expect(view.result.current.validation).toEqual({ valid: true, matched: 3 });
  });

  it('publish() slaagt, herlaadt de referentiedata en zet publishResult', async () => {
    const view = await renderReadyWizard();
    await setupReadyToValidate(view);
    apiRequest.mockResolvedValueOnce({ published: true }).mockImplementation((path) => {
      if (path.endsWith('/main-tables')) return Promise.resolve({ tables: [TABLE] });
      if (path.endsWith('/links')) return Promise.resolve({ links: [LINK, { id: 2, label: 'New link' }] });
      return Promise.resolve({});
    });

    await act(async () => { await view.result.current.publish(); });

    expect(view.result.current.publishResult).toEqual({ published: true });
    expect(view.result.current.links).toHaveLength(2);
  });

  it('publish() zet actionError bij een mislukte call', async () => {
    const view = await renderReadyWizard();
    await setupReadyToValidate(view);
    apiRequest.mockRejectedValue(new Error('Publish failed: conflict'));

    await act(async () => { await view.result.current.publish(); });

    expect(view.result.current.actionError).toBe('Publish failed: conflict');
    expect(view.result.current.publishing).toBe(false);
  });
});

describe('useExcelLinkWizard — beheer en navigatie', () => {
  it('deleteLink verwijdert de link uit de lijst bij succes', async () => {
    const { result } = await renderReadyWizard();
    apiRequest.mockResolvedValue({});

    await act(async () => { await result.current.deleteLink(1); });

    expect(apiRequest).toHaveBeenCalledWith('/data-links/links/1', { method: 'DELETE' });
    expect(result.current.links).toEqual([]);
  });

  it('deleteLink zet actionError bij een mislukte call, lijst blijft ongewijzigd', async () => {
    const { result } = await renderReadyWizard();
    apiRequest.mockRejectedValue(new Error('Delete failed'));

    await act(async () => { await result.current.deleteLink(1); });

    expect(result.current.actionError).toBe('Delete failed');
    expect(result.current.links).toEqual([LINK]);
  });

  it('canGoTo bewaakt elke stap-overgang op basis van de al ingevulde state', async () => {
    const { result } = await renderReadyWizard();

    expect(result.current.canGoTo(2)).toBe(false); // nog geen dataset
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dataset: { tableKey: 'ds-1' } }) }));
    await act(async () => { await result.current.uploadFile({ name: 'f.xlsx' }, 'l'); });

    expect(result.current.canGoTo(2)).toBe(true);
    expect(result.current.canGoTo(3)).toBe(false); // sleutels nog niet gekozen
  });

  it('goToStep navigeert alleen als canGoTo true is', async () => {
    const { result } = await renderReadyWizard();

    act(() => result.current.goToStep(4)); // niet toegestaan zonder dataset/sleutels
    expect(result.current.step).toBe(1);

    act(() => result.current.goToStep(1));
    expect(result.current.step).toBe(1);
  });

  it('reset() zet alle wizard-state terug naar de beginwaarden', async () => {
    const { result } = await renderReadyWizard();
    act(() => result.current.setMainTableKey('purchase-orders'));
    act(() => result.current.toggleColumn('col', 'col'));

    act(() => result.current.reset());

    expect(result.current.step).toBe(1);
    expect(result.current.dataset).toBeNull();
    expect(result.current.mainTableKey).toBe('');
    expect(result.current.selectedColumns.size).toBe(0);
  });
});
