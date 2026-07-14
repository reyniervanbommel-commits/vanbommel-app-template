'use strict';

const sql = require('mssql');
const { getSqlPool } = require('../utils/sqlPool');
const { time } = require('../utils/timing');
const { ROLES } = require('../constants/roles');
const { getTableByKey } = require('./TableRegistryService');
const { iso, mapRemarkRows } = require('./RowRemarksMapper');
const {
  encodeCursor,
  normalizeActive,
  normalizeBody,
  normalizeCursor,
  normalizeEmoji,
  normalizeLimit,
  normalizeOptionalColumnId,
  normalizePositiveId,
  normalizeRowIdentity,
  normalizeTableKey,
} = require('./RowRemarksValidation');
const defaultDependencies = {
  getPool: getSqlPool,
  getTable: getTableByKey,
  createTransaction: (pool) => new sql.Transaction(pool),
  createRequest: (transaction) => new sql.Request(transaction),
};
let dependencies = { ...defaultDependencies };
function setTestDependencies(overrides = null) {
  dependencies = overrides ? { ...defaultDependencies, ...overrides } : { ...defaultDependencies };
}
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function normalizeActor(actor) {
  const id = normalizePositiveId(actor?.id, 'actor');
  if (![ROLES.ADMIN, ROLES.EMPLOYEE].includes(actor?.role)) {
    throw httpError(403, 'Insufficient permissions');
  }
  return { id, role: actor.role, isAdmin: actor.role === ROLES.ADMIN };
}

function remarkRequest(request, { tableId, row, actorId }) {
  return request
    .input('tableId', sql.BigInt, tableId)
    .input('partitionKey', sql.NVarChar(32), row.partitionKey)
    .input('recordKey', sql.NVarChar(128), row.recordKey)
    .input('actorId', sql.Int, actorId);
}

async function context(tableKey, partitionKey, recordKey, actor) {
  const normalizedTableKey = normalizeTableKey(tableKey);
  const row = normalizeRowIdentity(partitionKey, recordKey);
  const normalizedActor = normalizeActor(actor);
  const [table, pool] = await Promise.all([
    dependencies.getTable(normalizedTableKey),
    dependencies.getPool(),
  ]);
  return { table, pool, row, actor: normalizedActor };
}

async function assertMasterRow(ctx, requestFactory = () => ctx.pool.request()) {
  const result = await remarkRequest(requestFactory(), {
    tableId: ctx.table.id, row: ctx.row, actorId: ctx.actor.id,
  }).query(`
    SELECT TOP (1) 1 AS found
    FROM dbo.tb_cache
    WHERE table_id = @tableId AND scope = 'master'
      AND partition_key = @partitionKey AND record_key = @recordKey AND detail_key = -1
  `);
  if (!result.recordset.length) throw httpError(404, 'Master row not found');
}

const REMARK_SELECT = `
  SELECT p.id, p.partition_key, p.record_key, p.column_id, p.body, p.created_by,
         p.created_at, p.is_deleted, p.deleted_at, u.display_name AS author_name,
         c.[key] AS column_key, c.label AS column_label, rx.emoji,
         rx.reaction_count, rx.reacted_by_current_user
  FROM paged p
  LEFT JOIN dbo.users u ON u.id = p.created_by
  LEFT JOIN dbo.tb_columns c ON c.id = p.column_id
  OUTER APPLY (
    SELECT rr.emoji, COUNT_BIG(*) AS reaction_count,
           MAX(CASE WHEN rr.user_id = @actorId THEN 1 ELSE 0 END) AS reacted_by_current_user
    FROM dbo.tb_row_remark_reactions rr
    WHERE rr.remark_id = p.id
    GROUP BY rr.emoji
  ) rx
  ORDER BY p.created_at DESC, p.id DESC, rx.emoji;
`;

async function listRemarks(input, actor) {
  const ctx = await context(input.tableKey, input.partitionKey, input.recordKey, actor);
  const limit = normalizeLimit(input.limit);
  const cursor = normalizeCursor(input.cursor);
  await assertMasterRow(ctx);
  const request = remarkRequest(ctx.pool.request(), {
    tableId: ctx.table.id, row: ctx.row, actorId: ctx.actor.id,
  })
    .input('take', sql.Int, limit + 1)
    .input('cursorAt', sql.DateTime2, cursor?.createdAt || null)
    .input('cursorId', sql.BigInt, cursor?.id || null);
  const result = await time('remarks_list_sql', () => request.query(`
    ;WITH paged AS (
      SELECT TOP (@take) r.*
      FROM dbo.tb_row_remarks r
      WHERE r.table_id = @tableId AND r.partition_key = @partitionKey
        AND r.record_key = @recordKey AND r.detail_key = -1
        AND (@cursorAt IS NULL OR r.created_at < @cursorAt
          OR (r.created_at = @cursorAt AND r.id < @cursorId))
      ORDER BY r.created_at DESC, r.id DESC
    )
    ${REMARK_SELECT}
    SELECT COUNT_BIG(*) AS total
    FROM dbo.tb_row_remarks
    WHERE table_id = @tableId AND partition_key = @partitionKey
      AND record_key = @recordKey AND detail_key = -1;
  `));
  const mapped = mapRemarkRows(result.recordsets[0], ctx.actor);
  const hasMore = mapped.length > limit;
  const items = mapped.slice(0, limit);
  const cursorRow = hasMore ? result.recordsets[0].find((row) => Number(row.id) === items.at(-1).id) : null;
  return {
    items,
    total: Number(result.recordsets[1]?.[0]?.total || 0),
    nextCursor: encodeCursor(cursorRow),
  };
}

async function fetchRemark(ctx, remarkId) {
  const result = await remarkRequest(ctx.pool.request(), {
    tableId: ctx.table.id, row: ctx.row, actorId: ctx.actor.id,
  }).input('remarkId', sql.BigInt, remarkId).query(`
    ;WITH paged AS (
      SELECT r.* FROM dbo.tb_row_remarks r
      WHERE r.id = @remarkId AND r.table_id = @tableId
        AND r.partition_key = @partitionKey AND r.record_key = @recordKey AND r.detail_key = -1
    )
    ${REMARK_SELECT}
  `);
  const remark = mapRemarkRows(result.recordset, ctx.actor)[0];
  if (!remark) throw httpError(404, 'Remark not found');
  return remark;
}

async function addRemark(input, actor) {
  const ctx = await context(input.tableKey, input.partitionKey, input.recordKey, actor);
  const body = normalizeBody(input.body);
  const columnId = normalizeOptionalColumnId(input.columnId);
  const result = await remarkRequest(ctx.pool.request(), {
    tableId: ctx.table.id, row: ctx.row, actorId: ctx.actor.id,
  }).input('body', sql.NVarChar(2000), body)
    .input('columnId', sql.BigInt, columnId)
    .query(`
      INSERT INTO dbo.tb_row_remarks
        (table_id, partition_key, record_key, detail_key, column_id, body, created_by)
      OUTPUT INSERTED.id
      SELECT @tableId, @partitionKey, @recordKey, -1, @columnId, @body, @actorId
      FROM dbo.tb_cache cache
      WHERE cache.table_id = @tableId AND cache.scope = 'master'
        AND cache.partition_key = @partitionKey AND cache.record_key = @recordKey
        AND cache.detail_key = -1
        AND (@columnId IS NULL OR EXISTS (
          SELECT 1 FROM dbo.tb_columns c
          WHERE c.id = @columnId AND c.table_id = @tableId
            AND c.scope = 'master' AND c.is_active = 1
        ));
    `);
  if (!result.recordset.length) throw httpError(404, 'Master row or column not found');
  return fetchRemark(ctx, Number(result.recordset[0].id));
}

async function deleteRemark(input, actor) {
  const ctx = await context(input.tableKey, input.partitionKey, input.recordKey, actor);
  const remarkId = normalizePositiveId(input.id, 'remarkId');
  await assertMasterRow(ctx);
  const result = await remarkRequest(ctx.pool.request(), {
    tableId: ctx.table.id, row: ctx.row, actorId: ctx.actor.id,
  }).input('remarkId', sql.BigInt, remarkId)
    .input('isAdmin', sql.Bit, ctx.actor.isAdmin ? 1 : 0)
    .query(`
      UPDATE r
      SET is_deleted = 1, deleted_by = @actorId, deleted_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id
      FROM dbo.tb_row_remarks r
      WHERE r.id = @remarkId AND r.table_id = @tableId
        AND r.partition_key = @partitionKey AND r.record_key = @recordKey AND r.detail_key = -1
        AND r.is_deleted = 0 AND (r.created_by = @actorId OR @isAdmin = 1);
      SELECT created_by, is_deleted
      FROM dbo.tb_row_remarks
      WHERE id = @remarkId AND table_id = @tableId
        AND partition_key = @partitionKey AND record_key = @recordKey AND detail_key = -1;
    `);
  if (!result.recordsets[0].length) {
    const state = result.recordsets[1]?.[0];
    if (!state) throw httpError(404, 'Remark not found');
    if (state.is_deleted) throw httpError(409, 'Remark has already been deleted');
    throw httpError(403, 'Only the author or an admin can delete this remark');
  }
  return fetchRemark(ctx, remarkId);
}

async function setReaction(input, actor) {
  const ctx = await context(input.tableKey, input.partitionKey, input.recordKey, actor);
  const remarkId = normalizePositiveId(input.id, 'remarkId');
  const emoji = normalizeEmoji(input.emoji);
  const active = normalizeActive(input.active);
  const tx = dependencies.createTransaction(ctx.pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const locked = await remarkRequest(dependencies.createRequest(tx), {
      tableId: ctx.table.id, row: ctx.row, actorId: ctx.actor.id,
    }).input('remarkId', sql.BigInt, remarkId).query(`
      SELECT r.created_by, r.is_deleted
      FROM dbo.tb_row_remarks r WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.tb_cache cache ON cache.table_id = r.table_id
        AND cache.scope = 'master' AND cache.partition_key = r.partition_key
        AND cache.record_key = r.record_key AND cache.detail_key = -1
      WHERE r.id = @remarkId AND r.table_id = @tableId
        AND r.partition_key = @partitionKey AND r.record_key = @recordKey AND r.detail_key = -1;
    `);
    const state = locked.recordset[0];
    if (!state) throw httpError(404, 'Remark or master row not found');
    if (state.is_deleted) throw httpError(409, 'Reacting to a deleted remark is not allowed');
    if (Number(state.created_by) === ctx.actor.id) throw httpError(403, 'Reacting to your own remark is not allowed');
    await dependencies.createRequest(tx)
      .input('remarkId', sql.BigInt, remarkId)
      .input('actorId', sql.Int, ctx.actor.id)
      .input('emoji', sql.NVarChar(16), emoji)
      .input('active', sql.Bit, active ? 1 : 0)
      .query(`
        IF @active = 1
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM dbo.tb_row_remark_reactions WITH (UPDLOCK, HOLDLOCK)
            WHERE remark_id = @remarkId AND user_id = @actorId AND emoji = @emoji
          )
            INSERT INTO dbo.tb_row_remark_reactions (remark_id, user_id, emoji)
            VALUES (@remarkId, @actorId, @emoji);
        END
        ELSE
          DELETE FROM dbo.tb_row_remark_reactions
          WHERE remark_id = @remarkId AND user_id = @actorId AND emoji = @emoji;
      `);
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
  return (await fetchRemark(ctx, remarkId)).reactions;
}

async function summarizeRemarks(tableKey, actor) {
  const normalizedActor = normalizeActor(actor);
  const table = await dependencies.getTable(normalizeTableKey(tableKey));
  const pool = await dependencies.getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      SELECT counts.partition_key, counts.record_key, counts.remark_count,
             latest.id, latest.body, latest.author_name, latest.created_at
      FROM (
        SELECT partition_key, record_key, COUNT_BIG(*) AS remark_count
        FROM dbo.tb_row_remarks
        WHERE table_id = @tableId AND detail_key = -1 AND is_deleted = 0
        GROUP BY partition_key, record_key
      ) counts
      CROSS APPLY (
        SELECT TOP (1) r.id, r.body, u.display_name AS author_name, r.created_at
        FROM dbo.tb_row_remarks r
        LEFT JOIN dbo.users u ON u.id = r.created_by
        WHERE r.table_id = @tableId AND r.partition_key = counts.partition_key
          AND r.record_key = counts.record_key AND r.detail_key = -1 AND r.is_deleted = 0
        ORDER BY r.created_at DESC, r.id DESC
      ) latest
      ORDER BY counts.partition_key, counts.record_key;
    `);
  void normalizedActor;
  return result.recordset.map((row) => ({
    partitionKey: row.partition_key,
    recordKey: row.record_key,
    count: Number(row.remark_count),
    latest: {
      id: Number(row.id),
      bodyPreview: [...row.body].slice(0, 280).join(''),
      authorName: row.author_name || null,
      createdAt: iso(row.created_at),
    },
  }));
}

module.exports = {
  addRemark,
  deleteRemark,
  listRemarks,
  setReaction,
  setTestDependencies,
  summarizeRemarks,
};
