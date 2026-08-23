import { describe, expect, it } from 'vitest';
import { isValidAlertEmail, mergeAlertEmails, parseAlertEmails } from './alertEmails';

describe('alertEmails', () => {
  it('splitst komma-gescheiden adressen', () => {
    expect(parseAlertEmails('a@b.com, c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('voegt unieke adressen toe', () => {
    expect(mergeAlertEmails(['ops@example.com'], 'ops@example.com; night@example.com'))
      .toEqual(['ops@example.com', 'night@example.com']);
  });

  it('wijst ongeldige adressen af', () => {
    expect(isValidAlertEmail('not-an-email')).toBe(false);
    expect(isValidAlertEmail('ops@example.com')).toBe(true);
  });
});
