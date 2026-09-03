import { ROLES } from '../constants/roles';

export const SETTINGS_AUDIENCE = Object.freeze({
  ALL: Object.freeze([ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SUPPLIER]),
  STAFF: Object.freeze([ROLES.ADMIN, ROLES.EMPLOYEE]),
  ADMIN: Object.freeze([ROLES.ADMIN]),
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.SUPPLIER]: 'Vendor',
});

export const SETTINGS_NAV_SECTIONS = Object.freeze([
  {
    id: 'app',
    heading: 'App',
    items: Object.freeze([
      { id: 'general', label: 'General', roles: SETTINGS_AUDIENCE.ALL },
    ]),
  },
  {
    id: 'people',
    heading: 'People',
    items: Object.freeze([
      { id: 'users', label: 'Users', roles: SETTINGS_AUDIENCE.STAFF },
      { id: 'analytics', label: 'Analytics', roles: SETTINGS_AUDIENCE.STAFF },
      { id: 'mail-template', label: 'Mail template', roles: SETTINGS_AUDIENCE.STAFF },
    ]),
  },
  {
    id: 'data',
    heading: 'Data',
    items: Object.freeze([
      { id: 'odata', label: 'OData', roles: SETTINGS_AUDIENCE.STAFF },
      { id: 'datamodel', label: 'Data model', roles: SETTINGS_AUDIENCE.STAFF },
      { id: 'external-links', label: 'External links', roles: SETTINGS_AUDIENCE.STAFF },
      { id: 'track-changes', label: 'Track changes', roles: SETTINGS_AUDIENCE.ADMIN },
      { id: 'd365-refresh', label: 'D365 refresh', roles: SETTINGS_AUDIENCE.ADMIN },
    ]),
  },
]);

/**
 * @param {string[]} roles
 * @returns {string}
 */
export function formatAudience(roles) {
  const list = Array.isArray(roles) ? roles : [];
  return list.map((role) => ROLE_LABELS[role] || role).join(', ');
}

/**
 * @param {string[]} tabRoles
 * @param {string} [userRole]
 * @returns {boolean}
 */
export function canSeeSettingsTab(tabRoles, userRole) {
  return Array.isArray(tabRoles) && tabRoles.includes(userRole);
}

/**
 * @param {string} [userRole]
 * @returns {{ id: string, heading: string, items: { id: string, label: string, roles: string[] }[] }[]}
 */
export function getVisibleSettingsSections(userRole) {
  return SETTINGS_NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeSettingsTab(item.roles, userRole)),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * @param {string} tabId
 * @returns {string[]}
 */
export function getSettingsTabRoles(tabId) {
  for (const section of SETTINGS_NAV_SECTIONS) {
    const item = section.items.find((entry) => entry.id === tabId);
    if (item) return item.roles;
  }
  return [];
}
