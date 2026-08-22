'use strict';

const { createMockPool } = require('../test-utils/mockSqlPool');

const sqlPoolModule = require('../utils/sqlPool');
const mockState = { pool: null };
sqlPoolModule.getSqlPool = async () => mockState.pool;

const emailService = require('./EmailService');
const settingsService = require('./SettingsService');
const refreshRunService = require('./RefreshRunService');

describe('RefreshRunService', () => {
  beforeEach(() => {
    refreshRunService.resetMemoryForTests();
    mockState.pool = createMockPool({ queries: [{ recordset: [{ id: 11 }] }, { recordset: [] }] });
    emailService.sendNightRefreshDigest = vi.fn().mockResolvedValue({ skipped: true });
    settingsService.getAsync = vi.fn().mockResolvedValue('ops@example.com');
  });

  it('maakt een run met queued entity-slots en serialiseert board vs full', () => {
    refreshRunService.create({
      source: 'manual',
      entityKeys: ['purchase-orders', 'vendors', 'items', 'product-receipt-lines'],
    });
    const board = refreshRunService.snapshotRun('board');
    const full = refreshRunService.snapshotRun('full');
    expect(board).toEqual(expect.objectContaining({
      currentLabel: 'Purchase orders',
      entityCount: 4,
      entityIndex: 1,
    }));
    expect(board.entities).toBeUndefined();
    expect(board.error_text).toBeUndefined();
    expect(full.entities).toHaveLength(4);
    expect(full.entities[0].status).toBe('queued');
    expect(full.error_text).toBeNull();
  });

  it('hecht een night-start aan een lopende manual run', () => {
    refreshRunService.create({ source: 'manual', entityKeys: ['purchase-orders'] });
    const attached = refreshRunService.attachNight();
    expect(attached.attached).toBe(true);
    expect(refreshRunService.shouldSendNightMail({
      ...refreshRunService.snapshotRun('full'),
      source: 'manual',
      nightAttached: true,
      status: 'done',
      entities: [],
    })).toBe(false);
  });

  it('stuurt geen night-mail bij een volledig geslaagde attached manual run', () => {
    const run = refreshRunService.create({ source: 'manual', entityKeys: ['purchase-orders'] });
    run.nightAttached = true;
    run.status = 'done';
    expect(refreshRunService.shouldSendNightMail(run)).toBe(false);
  });

  it('stuurt night-mail bij run.error, interrupted of entity.error', () => {
    const base = { source: 'night', nightAttached: false, entities: [] };
    expect(refreshRunService.shouldSendNightMail({ ...base, status: 'error' })).toBe(true);
    expect(refreshRunService.shouldSendNightMail({ ...base, status: 'interrupted' })).toBe(true);
    expect(refreshRunService.shouldSendNightMail({
      ...base,
      status: 'done',
      entities: [{ status: 'error' }],
    })).toBe(true);
    expect(refreshRunService.shouldSendNightMail({
      source: 'manual',
      nightAttached: false,
      status: 'error',
      entities: [],
    })).toBe(false);
  });

  it('zet cascade-status: PO ok + lookup fail = done + entity.error + night-mail', async () => {
    const run = refreshRunService.create({
      source: 'night',
      entityKeys: ['purchase-orders', 'vendors'],
    });
    refreshRunService.markEntityDone('purchase-orders');
    refreshRunService.markEntityError('vendors', 'vendors: timeout\n    at refresh (x.js:1)');
    await refreshRunService.finishSuccess();
    expect(run.status).toBe('done');
    expect(run.error_text).toMatch(/^vendors:/);
    expect(run.error_text).not.toMatch(/at refresh/);
    expect(refreshRunService.shouldSendNightMail(run)).toBe(true);
  });

  it('zet run.status=error alleen als purchase-orders zelf faalt', async () => {
    refreshRunService.create({
      source: 'manual',
      entityKeys: ['purchase-orders', 'vendors'],
    });
    const run = await refreshRunService.failPurchaseOrders('PO fetch failed');
    expect(run.status).toBe('error');
    expect(run.entities.find((entity) => entity.tableKey === 'purchase-orders').status).toBe('error');
    expect(refreshRunService.shouldSendNightMail(run)).toBe(false);
  });

  it('laat een ACS-fout de run-status ongewijzigd', async () => {
    emailService.sendNightRefreshDigest = vi.fn().mockRejectedValue(new Error('ACS down'));
    const run = refreshRunService.create({ source: 'night', entityKeys: ['purchase-orders'] });
    run.id = 9;
    run.status = 'error';
    run.error_text = 'PO failed';
    await refreshRunService.sendNightMailSafe(run);
    expect(run.status).toBe('error');
    expect(run.alert_status).toBe('failed');
  });

  it('stript stacks uit error_text', () => {
    expect(refreshRunService.stripErrorText('boom\n    at foo (a.js:1:1)')).toBe('boom');
  });

  it('serialiseert board vs full progress zonder entities in board', () => {
    refreshRunService.create({ source: 'night', entityKeys: ['purchase-orders', 'vendors'] });
    refreshRunService.markEntityError('vendors', 'vendors: failed');
    const board = refreshRunService.serializeLivePayload({ status: 'saving', fetched: 1, saved: 1, lookupWarnings: [] }, { running: true });
    const full = refreshRunService.serializeLivePayload({ status: 'saving', fetched: 1, saved: 1, lookupWarnings: [] }, { running: true, view: 'full' });
    expect(board.progress.lookupWarnings).toEqual([]);
    expect(board.run.entities).toBeUndefined();
    expect(board.run.error_text).toBeUndefined();
    expect(full.run.entities).toHaveLength(2);
    expect(full.run.entities[1].error_text).toBe('vendors: failed');
  });

  it('clamped listRuns op max 20', async () => {
    mockState.pool = createMockPool({ queries: [{ recordset: [] }] });
    const rows = await refreshRunService.listRuns({ limit: 99 });
    expect(rows).toEqual([]);
    expect(mockState.pool.calls[0].inputs.limit).toBe(20);
  });
});
