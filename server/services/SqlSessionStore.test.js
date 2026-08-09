'use strict';

const SqlSessionStore = require('./SqlSessionStore');
const { createMockPool } = require('../test-utils/mockSqlPool');

function createStore(pool, opts) {
  const store = new SqlSessionStore(opts);
  // getPool() is een instance-methode — direct overschrijven is genoeg, geen module-mocking nodig.
  store.getPool = async () => pool;
  return store;
}

function get(store, sid) {
  return new Promise((resolve, reject) => store.get(sid, (err, sess) => (err ? reject(err) : resolve(sess))));
}
function set(store, sid, sess) {
  return new Promise((resolve, reject) => store.set(sid, sess, (err) => (err ? reject(err) : resolve())));
}
function touch(store, sid, sess) {
  return new Promise((resolve, reject) => store.touch(sid, sess, (err) => (err ? reject(err) : resolve())));
}
function destroy(store, sid) {
  return new Promise((resolve, reject) => store.destroy(sid, (err) => (err ? reject(err) : resolve())));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('constructor', () => {
  it('accepteert een geldige tabelnaam', () => {
    const store = createStore(createMockPool(), { table: 'custom_sessions' });
    expect(store.table).toBe('custom_sessions');
  });

  it('valt terug op de default tabelnaam bij een ongeldige (bv. SQL-injectie-achtige) waarde', () => {
    const store = createStore(createMockPool(), { table: "sessions; DROP TABLE users;--" });
    expect(store.table).toBe('sessions');
  });
});

describe('get', () => {
  it('haalt een sessie op uit de DB en parset de JSON bij een cache-miss', async () => {
    const pool = createMockPool({ queries: [{ recordset: [{ session: JSON.stringify({ userId: 1 }) }] }] });
    const store = createStore(pool);

    const sess = await get(store, 'sid-1');

    expect(sess).toEqual({ userId: 1 });
    expect(pool.calls).toHaveLength(1);
  });

  it('geeft null terug zonder te gooien als de sid niet (meer) bestaat', async () => {
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    const store = createStore(pool);

    const sess = await get(store, 'unknown-sid');

    expect(sess).toBeNull();
  });

  it('geeft de fout door via de callback in plaats van te gooien bij een DB-fout', async () => {
    const pool = {
      request: () => {
        const req = { input: () => req, query: async () => { throw new Error('boom'); } };
        return req;
      },
    };
    const store = createStore(pool);

    await expect(get(store, 'sid-1')).rejects.toThrow('boom');
  });

  it('hergebruikt de read-cache binnen de TTL — geen tweede DB-call voor dezelfde sid', async () => {
    const pool = createMockPool({ queries: [{ recordset: [{ session: JSON.stringify({ userId: 1 }) }] }] });
    const store = createStore(pool);

    await get(store, 'sid-1');
    const second = await get(store, 'sid-1');

    expect(second).toEqual({ userId: 1 });
    expect(pool.calls).toHaveLength(1);
  });

  it('geeft bij elke get() een nieuw geparste object terug — nooit een gedeeld mutable object', async () => {
    const pool = createMockPool({ queries: [{ recordset: [{ session: JSON.stringify({ userId: 1 }) }] }] });
    const store = createStore(pool);

    const first = await get(store, 'sid-1');
    first.userId = 999;
    const second = await get(store, 'sid-1');

    expect(second.userId).toBe(1);
  });

  it('haalt opnieuw uit de DB zodra de read-cache-TTL (30s) verstreken is', async () => {
    vi.useFakeTimers();
    const pool = createMockPool({
      queries: [
        { recordset: [{ session: JSON.stringify({ userId: 1 }) }] },
        { recordset: [{ session: JSON.stringify({ userId: 1 }) }] },
      ],
    });
    const store = createStore(pool);

    await get(store, 'sid-1');
    vi.advanceTimersByTime(30 * 1000 + 1);
    await get(store, 'sid-1');

    expect(pool.calls).toHaveLength(2);
  });
});

describe('set', () => {
  it('schrijft de sessie weg via een MERGE en vult de read-cache direct (geen extra DB-call bij een daaropvolgende get)', async () => {
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    const store = createStore(pool);

    await set(store, 'sid-1', { userId: 42, cookie: {} });
    const sess = await get(store, 'sid-1');

    expect(sess).toEqual({ userId: 42, cookie: {} });
    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].sql).toContain('MERGE dbo.sessions');
  });
});

describe('touch', () => {
  it('schrijft de expiry bij bij de eerste touch voor een sid', async () => {
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    const store = createStore(pool);

    await touch(store, 'sid-1', { cookie: {} });

    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].sql).toContain('UPDATE dbo.sessions SET expires');
  });

  it('is een no-op binnen het touch-interval (5 min) — geen tweede DB-call', async () => {
    vi.useFakeTimers();
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    const store = createStore(pool);

    await touch(store, 'sid-1', { cookie: {} });
    vi.advanceTimersByTime(60 * 1000);
    await touch(store, 'sid-1', { cookie: {} });

    expect(pool.calls).toHaveLength(1);
  });

  it('schrijft opnieuw weg zodra het touch-interval verstreken is', async () => {
    vi.useFakeTimers();
    const pool = createMockPool({ queries: [{ recordset: [] }, { recordset: [] }] });
    const store = createStore(pool);

    await touch(store, 'sid-1', { cookie: {} });
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await touch(store, 'sid-1', { cookie: {} });

    expect(pool.calls).toHaveLength(2);
  });
});

describe('destroy', () => {
  it('verwijdert de sessie uit de DB en de caches — een daaropvolgende get() haalt niet uit een stale cache', async () => {
    const pool = createMockPool({
      queries: [
        { recordset: [] }, // set
        { recordset: [] }, // destroy DELETE
        { recordset: [] }, // get na destroy: niets meer in de DB
      ],
    });
    const store = createStore(pool);
    await set(store, 'sid-1', { userId: 1, cookie: {} });

    await destroy(store, 'sid-1');
    const sess = await get(store, 'sid-1');

    expect(sess).toBeNull();
    expect(pool.calls[1].sql).toContain('DELETE FROM dbo.sessions');
  });
});
