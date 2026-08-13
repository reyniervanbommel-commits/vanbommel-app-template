'use strict';

const bcrypt = require('bcrypt');
const { createMockPool } = require('../test-utils/mockSqlPool');

// AuthService.js destructureert `getSqlPool` uit dit module op het moment van
// require — we vervangen de functie op het gedeelde exports-object VOORDAT
// AuthService hieronder voor het eerst wordt gerequired, zodat de destructuring
// onze vervangende functie oppikt i.p.v. de echte (die een MSSQL-verbinding opent).
const sqlPoolModule = require('../utils/sqlPool');
const mockState = { pool: null };
sqlPoolModule.getSqlPool = async () => mockState.pool;

const {
  login,
  resetPassword,
  requestPasswordReset,
  setPasswordForUser,
  validatePasswordRules,
  normalizeEmail,
  normalizeRole,
  mapUserForSession,
} = require('./AuthService');

// Eén keer een echte bcrypt-hash berekenen (cost 12) i.p.v. per test — bevestigt de
// echte bcrypt-integratie zonder elke test een dure hash-operatie te laten doen.
const CORRECT_PASSWORD = 'CorrectPassw0rd!';
let correctPasswordHash;

beforeAll(async () => {
  correctPasswordHash = await bcrypt.hash(CORRECT_PASSWORD, 12);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('pure helpers', () => {
  it('normalizeEmail trimt en lowercased', () => {
    expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('normalizeRole accepteert alleen toegestane rollen', () => {
    expect(normalizeRole(' Employee ')).toBe('employee');
    expect(normalizeRole('superadmin')).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });

  it('mapUserForSession strip gevoelige velden en normaliseert booleans', () => {
    const mapped = mapUserForSession({
      id: 1,
      email: 'a@b.com',
      role: 'ADMIN',
      password_hash: 'secret-hash-should-not-leak',
      mfa_enabled: 1,
      must_set_password: 0,
      is_locked: 0,
      failed_attempts: 2,
    });
    expect(mapped).not.toHaveProperty('password_hash');
    expect(mapped).not.toHaveProperty('failed_attempts');
    expect(mapped.role).toBe('admin');
    expect(mapped.mfa_enabled).toBe(true);
    expect(mapped.must_set_password).toBe(false);
  });

  it('mapUserForSession valt terug op de supplier-rol bij een onbekende/ontbrekende rol', () => {
    expect(mapUserForSession({ id: 1, role: 'bogus' }).role).toBe('supplier');
  });

  it('mapUserForSession geeft null zonder user', () => {
    expect(mapUserForSession(null)).toBeNull();
  });

  it('validatePasswordRules weigert wachtwoorden korter dan 8 tekens', () => {
    expect(validatePasswordRules('short1')).toEqual({ valid: false, error: expect.any(String) });
    expect(validatePasswordRules('longenoughpassword')).toEqual({ valid: true });
  });
});

describe('login', () => {
  function userRow(overrides = {}) {
    return {
      id: 1,
      email: 'supplier@example.com',
      role: 'supplier',
      password_hash: correctPasswordHash,
      must_set_password: false,
      is_locked: false,
      failed_attempts: 0,
      ...overrides,
    };
  }

  it('gooit een generieke fout als het e-mailadres niet bestaat — geen user enumeration', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [] }] });

    await expect(login('unknown@example.com', 'whatever')).rejects.toThrow('Email address or password is incorrect');
  });

  it('gooit een fout voor een vergrendeld account, zonder de wachtwoordcheck uit te voeren', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [userRow({ is_locked: true })] }] });

    await expect(login('supplier@example.com', CORRECT_PASSWORD)).rejects.toThrow('Account locked');
  });

  it('logt in met het juiste wachtwoord en reset failed_attempts', async () => {
    mockState.pool = createMockPool({
      queries: [{ recordset: [userRow({ failed_attempts: 2 })] }, { recordset: [] }],
    });

    const result = await login('supplier@example.com', CORRECT_PASSWORD);

    expect(result.user.role).toBe('supplier');
    expect(result.user).not.toHaveProperty('password_hash');
    const resetCall = mockState.pool.calls[1];
    expect(resetCall.sql).toContain('failed_attempts = 0');
    expect(resetCall.inputs.id).toBe(1);
  });

  it('weigert een verkeerd wachtwoord, verhoogt failed_attempts, sluit nog niet af onder de 3e poging', async () => {
    mockState.pool = createMockPool({
      queries: [{ recordset: [userRow({ failed_attempts: 0 })] }, { recordset: [] }],
    });

    // Progressive delay (echte setTimeout, max 1s hier) loopt gewoon mee — fake timers
    // bleken onbetrouwbaar te combineren met de echte async bcrypt-compare hieronder.
    const promise = login('supplier@example.com', 'wrong-password');
    await expect(promise).rejects.toThrow('Email address or password is incorrect');

    const updateCall = mockState.pool.calls[1];
    expect(updateCall.inputs.attempts).toBe(1);
    expect(updateCall.inputs.locked).toBe(0);
  }, 10000);

  it('vergrendelt het account na de 3e mislukte poging met een aparte foutmelding', async () => {
    mockState.pool = createMockPool({
      queries: [{ recordset: [userRow({ failed_attempts: 2 })] }, { recordset: [] }],
    });

    const promise = login('supplier@example.com', 'wrong-password');
    await expect(promise).rejects.toThrow('Account locked after 3 failed attempts');

    const updateCall = mockState.pool.calls[1];
    expect(updateCall.inputs.attempts).toBe(3);
    expect(updateCall.inputs.locked).toBe(1);
  }, 10000);

  it('vraagt om een wachtwoord-setup als must_set_password staat en er geen bootstrap-match is', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [userRow({ must_set_password: true, password_hash: null })] }] });

    const result = await login('supplier@example.com', 'anything');

    expect(result.requiresPasswordSetup).toBe(true);
  });

  it('promoveert naar admin via de bootstrap-credentials als e-mail+wachtwoord matchen', async () => {
    vi.stubEnv('BOOTSTRAP_ADMIN_EMAIL', 'boot@example.com');
    vi.stubEnv('BOOTSTRAP_ADMIN_PASSWORD', 'bootstrap-pw');
    mockState.pool = createMockPool({
      queries: [
        { recordset: [userRow({ email: 'boot@example.com', must_set_password: true, password_hash: null, role: 'supplier' })] },
        { recordset: [] },
      ],
    });

    const result = await login('boot@example.com', 'bootstrap-pw');

    expect(result.user.role).toBe('admin');
    expect(result.user.must_set_password).toBe(false);
  });

  it('MFA-gap (bekend, zie plan): mfa_enabled beïnvloedt login() op dit moment niet — er bestaat nog geen backend mfa/verify-route', async () => {
    mockState.pool = createMockPool({
      queries: [{ recordset: [userRow({ mfa_enabled: true, failed_attempts: 0 })] }, { recordset: [] }],
    });

    const result = await login('supplier@example.com', CORRECT_PASSWORD);

    // Documenteert het huidige gedrag: login slaagt direct, geen MFA-stap wordt afgedwongen.
    expect(result.user.mfa_enabled).toBe(true);
    expect(result.requiresMfa).toBeUndefined();
  });
});

describe('setPasswordForUser', () => {
  it('weigert een te kort wachtwoord zonder de DB aan te raken', async () => {
    mockState.pool = createMockPool({ queries: [] });

    await expect(setPasswordForUser(1, 'short')).rejects.toThrow();
    expect(mockState.pool.calls).toHaveLength(0);
  });

  it('slaat een geldig wachtwoord op als bcrypt-hash', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [] }] });

    await setPasswordForUser(1, 'longenoughpassword');

    expect(mockState.pool.calls).toHaveLength(1);
    expect(mockState.pool.calls[0].inputs.hash).not.toBe('longenoughpassword');
  });
});

describe('requestPasswordReset', () => {
  it('geeft EMAIL_NOT_FOUND terug zonder een token aan te maken voor een onbekend e-mailadres', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [] }] });

    const result = await requestPasswordReset('unknown@example.com');

    expect(result).toEqual({ success: false, code: 'EMAIL_NOT_FOUND' });
    expect(mockState.pool.calls).toHaveLength(1);
  });

  it('maakt een token aan voor een bekend e-mailadres en slaat alleen de hash op', async () => {
    mockState.pool = createMockPool({
      queries: [{ recordset: [{ id: 1, email: 'supplier@example.com' }] }, { recordset: [] }],
    });

    const result = await requestPasswordReset('supplier@example.com');

    expect(result.success).toBe(true);
    expect(typeof result.token).toBe('string');
    const insertCall = mockState.pool.calls[1];
    expect(insertCall.inputs.tokenHash).not.toBe(result.token);
  });
});

describe('resetPassword', () => {
  it('gooit een fout voor een ongeldig of verlopen token', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [] }] });

    await expect(resetPassword('bogus-token', 'longenoughpassword')).rejects.toThrow('Reset link is invalid or expired');
  });

  it('zet het wachtwoord en markeert het token als gebruikt voor een geldig token', async () => {
    mockState.pool = createMockPool({
      queries: [
        { recordset: [{ id: 10, user_id: 1 }] }, // token lookup
        { recordset: [] }, // password_hash update (setPasswordForUser)
        { recordset: [] }, // mark token used
        { recordset: [{ id: 1, email: 'supplier@example.com', role: 'supplier' }] }, // reload user
      ],
    });

    const mapped = await resetPassword('valid-token', 'longenoughpassword');

    expect(mapped.email).toBe('supplier@example.com');
    const markUsedCall = mockState.pool.calls[2];
    expect(markUsedCall.sql).toContain('used_at = SYSUTCDATETIME()');
    expect(markUsedCall.inputs.id).toBe(10);
  });
});
