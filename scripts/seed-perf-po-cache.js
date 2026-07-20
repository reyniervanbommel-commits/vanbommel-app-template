#!/usr/bin/env node
'use strict';

/**
 * Seed tb_cache with synthetic PO rows for local perf-review (board-load + tabs).
 * Usage: node scripts/seed-perf-po-cache.js [--orders=80] [--lines=3]
 */
require('dotenv').config();
const sql = require('mssql');
const { parseSqlConnectionString } = require('../server/utils/sqlConnectionConfig');

const ORDER_COUNT = Number(process.argv.find((a) => a.startsWith('--orders='))?.split('=')[1] || 80);
const LINES_PER_ORDER = Number(process.argv.find((a) => a.startsWith('--lines='))?.split('=')[1] || 3);
const PARTITION = 'whsl';

async function main() {
  const pool = await sql.connect(parseSqlConnectionString(process.env.SQL_CONNECTION_STRING));
  const tableRes = await pool.request().query("SELECT id FROM dbo.tb_tables WHERE [key] = 'purchase-orders'");
  const tableId = tableRes.recordset[0]?.id;
  if (!tableId) throw new Error('purchase-orders table not found — run migrations first');

  await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query('DELETE FROM dbo.tb_cache WHERE table_id = @tableId');

  const now = new Date();
  const masterReq = pool.request();
  masterReq.input('tableId', sql.BigInt, tableId);

  const detailReq = pool.request();
  detailReq.input('tableId', sql.BigInt, tableId);

  const masterValues = [];
  const detailValues = [];

  for (let i = 1; i <= ORDER_COUNT; i += 1) {
    const po = `PO-${String(i).padStart(5, '0')}`;
    const masterJson = JSON.stringify({
      orderNumber: po,
      vendorAccount: `V${String((i % 20) + 1).padStart(4, '0')}`,
      vendorName: `Vendor ${(i % 20) + 1}`,
      status: i % 3 === 0 ? 'Open' : 'Confirmed',
      currencyCode: 'EUR',
      requestedDeliveryDate: now.toISOString(),
      createdDateTime: now.toISOString(),
      remarks: null,
    });
    masterValues.push(`(@tableId, 'master', '${PARTITION}', '${po}', -1, N'${masterJson.replace(/'/g, "''")}', @now, @now, 0)`);

    for (let line = 1; line <= LINES_PER_ORDER; line += 1) {
      const detailJson = JSON.stringify({
        lineNumber: line,
        itemNumber: `ITEM-${String((i + line) % 50).padStart(4, '0')}`,
        description: `Line ${line} for ${po}`,
        quantity: line * 10,
        unit: 'pcs',
        lineAmount: line * 100.5,
        requestedDeliveryDate: now.toISOString(),
      });
      detailValues.push(`(@tableId, 'detail', '${PARTITION}', '${po}', ${line}, N'${detailJson.replace(/'/g, "''")}', @now, @now, 0)`);
    }
  }

  const chunkInsert = async (rows, batchSize = 40) => {
    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const chunk = rows.slice(offset, offset + batchSize);
      await pool.request()
        .input('tableId', sql.BigInt, tableId)
        .input('now', sql.DateTime2, now)
        .query(`
          INSERT INTO dbo.tb_cache
            (table_id, scope, partition_key, record_key, detail_key, data_json, source_modified_at, first_seen_at, removed_at_source)
          VALUES ${chunk.join(',\n')}
        `);
    }
  };

  await chunkInsert(masterValues);
  await chunkInsert(detailValues);

  await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .input('now', sql.DateTime2, now)
    .query(`
      MERGE dbo.tb_sync_state AS target
      USING (SELECT @tableId AS table_id) AS src ON target.table_id = src.table_id
      WHEN MATCHED THEN UPDATE SET last_full_sync_at = @now, watermark = @now
      WHEN NOT MATCHED THEN INSERT (table_id, watermark, last_full_sync_at) VALUES (@tableId, @now, @now);
    `);

  // Ledger entries to exercise tb_ledger read path
  await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query('DELETE FROM dbo.tb_change_ledger WHERE table_id = @tableId AND source = \'D365\'');

  const ledgerValues = [];
  for (let i = 1; i <= Math.min(ORDER_COUNT, 200); i += 1) {
    const po = `PO-${String(i).padStart(5, '0')}`;
    ledgerValues.push(`(@tableId, '${PARTITION}', '${po}', -1, 'status', 'D365', 'UPDATE', @now)`);
  }
  await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .input('now', sql.DateTime2, now)
    .query(`
      INSERT INTO dbo.tb_change_ledger
        (table_id, partition_key, record_key, detail_key, field_key, source, action, created_at)
      VALUES ${ledgerValues.join(',\n')}
    `);

  const count = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query(`
      SELECT
        SUM(CASE WHEN scope = 'master' THEN 1 ELSE 0 END) AS masters,
        SUM(CASE WHEN scope = 'detail' THEN 1 ELSE 0 END) AS details
      FROM dbo.tb_cache WHERE table_id = @tableId
    `);

  console.log(`Seeded ${count.recordset[0].masters} masters + ${count.recordset[0].details} details for perf-review`);
  await pool.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
