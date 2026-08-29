import { describe, expect, it } from 'vitest';
import { pickStartupView } from './purchaseOrderStartupView';

describe('pickStartupView', () => {
  const views = [
    { id: 1, scope: 'personal', isDefault: false },
    { id: 2, scope: 'personal', isDefault: true },
    { id: 3, scope: 'global', isDefault: true },
    { id: 4, scope: 'vendor', isDefault: true },
  ];

  it('kiest voor staff de persoonlijke default view', () => {
    expect(pickStartupView(views, false).id).toBe(2);
  });

  it('kiest voor een supplier de vendor-default view', () => {
    expect(pickStartupView(views, true).id).toBe(4);
  });
});
