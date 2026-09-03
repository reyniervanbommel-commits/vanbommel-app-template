import { describe, expect, it } from 'vitest';
import { ROLES } from '../constants/roles';
import {
  SETTINGS_AUDIENCE,
  canSeeSettingsTab,
  formatAudience,
  getSettingsTabRoles,
  getVisibleSettingsSections,
} from './settingsAudience';

describe('settingsAudience', () => {
  it('labels vendor as Vendor', () => {
    expect(formatAudience(SETTINGS_AUDIENCE.ALL)).toBe('Admin, Employee, Vendor');
    expect(formatAudience(SETTINGS_AUDIENCE.STAFF)).toBe('Admin, Employee');
    expect(formatAudience(SETTINGS_AUDIENCE.ADMIN)).toBe('Admin');
  });

  it('shows only General to vendors', () => {
    const sections = getVisibleSettingsSections(ROLES.SUPPLIER);
    expect(sections).toHaveLength(1);
    expect(sections[0].items.map((item) => item.id)).toEqual(['general']);
  });

  it('hides admin-only data tabs from employees', () => {
    const data = getVisibleSettingsSections(ROLES.EMPLOYEE).find((section) => section.id === 'data');
    expect(data.items.map((item) => item.id)).toEqual(['odata', 'datamodel', 'external-links']);
  });

  it('lets admins see every tab', () => {
    const ids = getVisibleSettingsSections(ROLES.ADMIN).flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toContain('d365-refresh');
    expect(ids).toContain('track-changes');
    expect(ids).toContain('users');
    expect(ids).toContain('general');
  });

  it('resolves audience for a tab id', () => {
    expect(getSettingsTabRoles('general')).toEqual(SETTINGS_AUDIENCE.ALL);
    expect(getSettingsTabRoles('users')).toEqual(SETTINGS_AUDIENCE.STAFF);
    expect(canSeeSettingsTab(SETTINGS_AUDIENCE.ADMIN, ROLES.EMPLOYEE)).toBe(false);
  });
});
