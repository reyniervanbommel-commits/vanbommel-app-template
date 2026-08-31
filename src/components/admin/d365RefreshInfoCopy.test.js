import { describe, expect, it } from 'vitest';
import { D365_REFRESH_INFO } from './d365RefreshInfoCopy';

describe('D365_REFRESH_INFO', () => {
  it('noemt Azure Logic App en 03:00 Europe/Amsterdam, niet GitHub cron', () => {
    expect(D365_REFRESH_INFO).toMatch(/Azure Logic App/i);
    expect(D365_REFRESH_INFO).toMatch(/03:00/);
    expect(D365_REFRESH_INFO).toMatch(/Europe\/Amsterdam/);
    expect(D365_REFRESH_INFO).not.toMatch(/GitHub Actions/);
    expect(D365_REFRESH_INFO).not.toMatch(/00:00 UTC/);
  });
});
