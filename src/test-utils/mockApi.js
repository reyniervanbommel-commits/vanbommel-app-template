import { vi } from 'vitest';

// Stub global fetch met een queue van responses, voor tests van src/utils/api.js
// zelf (apiRequest praat rechtstreeks met fetch, niet met een hogere wrapper).
// Voor hogere lagen (hooks/components) blijft `vi.mock('../utils/api', () =>
// ({ apiRequest: vi.fn() }))` het standaardpatroon — zie bv. src/hooks/useRccpPage.test.js.
export function mockFetchSequence(responses) {
  let index = 0;
  const fetchMock = vi.fn(async () => {
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    const { status = 200, body = {} } = next;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
