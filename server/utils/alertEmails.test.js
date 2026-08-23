'use strict';

const { parseAlertEmails, validateAlertEmails, serializeAlertEmails } = require('./alertEmails');

describe('alertEmails', () => {
  it('splitst komma- en spatiescheiden adressen', () => {
    expect(parseAlertEmails('a@b.com, c@d.com;e@f.com')).toEqual(['a@b.com', 'c@d.com', 'e@f.com']);
  });

  it('wijst ongeldige adressen af', () => {
    expect(() => validateAlertEmails(['not-an-email'])).toThrow(/invalid/i);
  });

  it('serialiseert een geldige lijst als komma-gescheiden string', () => {
    expect(serializeAlertEmails(['ops@example.com', 'night@example.com'])).toBe('ops@example.com,night@example.com');
  });
});
