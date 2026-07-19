'use strict';

// BI-route (#AB:219). Gemount op /api/bi achter requireRole([ADMIN, EMPLOYEE]) (zie server.js).
// v1 = staff-only: leest via TableDataService.read() (staff-scope = alle vendors), geen supplier-scoping.
// Grafiekdefinities in dbo.bi_charts; mutaties alleen door de eigenaar.

const express = require('express');
const sql = require('mssql');
const { body, param, validationResult } = require('express-validator');
const dataService = require('../services/TableDataService');
const { getSqlPool } = require('../utils/sqlPool');
const { time } = require('../utils/timing');
const { aggregateCharts, AGGREGATIONS, CHART_TYPES, DATE_GROUPINGS, resolveMeasures } = require('../utils/biAggregate');
const { normalizeConfig } = require('../utils/biChartConfig');

const router = express.Router();

const BOARD_KEY_PATTERN = /^[a-z0-9-]{2,64}$/;
const VISIBILITIES = ['private', 'shared'];
const MAX_CHARTS_PER_AGGREGATE = 20;

function validationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Invalid request', details: errors.array() });
    return true;
  }
  return false;
}

function mapChartRow(row) {
  let config = {};
  try { config = JSON.parse(row.config_json || '{}'); } catch { config = {}; }
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    boardKey: row.board_key,
    name: row.name,
    config: normalizeConfig(config),
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/bi/charts — eigen private + alle shared grafieken.
router.get('/charts', async (req, res, next) => {
  try {
    const pool = await getSqlPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT id, user_id, board_key, name, config_json, visibility, created_at, updated_at
        FROM dbo.bi_charts
        WHERE user_id = @userId OR visibility = 'shared'
        ORDER BY name ASC
      `);
    return res.json({ charts: result.recordset.map(mapChartRow) });
  } catch (err) {
    return next(err);
  }
});

const chartWriteValidator = [
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('visibility').optional().isIn(VISIBILITIES),
  body('boardKey').optional().matches(BOARD_KEY_PATTERN),
  body('config').isObject(),
  body('config.type').optional().isIn(CHART_TYPES),
  body('config.aggregation').optional().isIn(AGGREGATIONS),
];

// POST /api/bi/charts — nieuwe grafiek (eigenaar = huidige gebruiker).
router.post('/charts', chartWriteValidator, async (req, res, next) => {
  try {
    if (validationError(req, res)) return undefined;
    const boardKey = BOARD_KEY_PATTERN.test(String(req.body.boardKey || '')) ? req.body.boardKey : 'purchase-orders';
    const visibility = VISIBILITIES.includes(req.body.visibility) ? req.body.visibility : 'private';
    const config = normalizeConfig(req.body.config);
    const pool = await getSqlPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('boardKey', sql.NVarChar(64), boardKey)
      .input('name', sql.NVarChar(200), String(req.body.name).trim())
      .input('configJson', sql.NVarChar(sql.MAX), JSON.stringify(config))
      .input('visibility', sql.NVarChar(16), visibility)
      .query(`
        INSERT INTO dbo.bi_charts (user_id, board_key, name, config_json, visibility)
        OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.board_key, INSERTED.name,
               INSERTED.config_json, INSERTED.visibility, INSERTED.created_at, INSERTED.updated_at
        VALUES (@userId, @boardKey, @name, @configJson, @visibility)
      `);
    return res.status(201).json({ chart: mapChartRow(result.recordset[0]) });
  } catch (err) {
    return next(err);
  }
});

async function loadChart(pool, id) {
  const result = await pool.request()
    .input('id', sql.BigInt, id)
    .query(`
      SELECT id, user_id, board_key, name, config_json, visibility, created_at, updated_at
      FROM dbo.bi_charts WHERE id = @id
    `);
  return result.recordset.length ? result.recordset[0] : null;
}

// PATCH /api/bi/charts/:id — alleen de eigenaar mag muteren.
router.patch('/charts/:id', param('id').isInt({ min: 1 }), chartWriteValidator, async (req, res, next) => {
  try {
    if (validationError(req, res)) return undefined;
    const id = Number(req.params.id);
    const pool = await getSqlPool();
    const existing = await loadChart(pool, id);
    if (!existing) return res.status(404).json({ error: 'Chart not found' });
    if (Number(existing.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only the owner can modify this chart' });
    }
    const visibility = VISIBILITIES.includes(req.body.visibility) ? req.body.visibility : existing.visibility;
    const config = normalizeConfig(req.body.config);
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .input('name', sql.NVarChar(200), String(req.body.name).trim())
      .input('configJson', sql.NVarChar(sql.MAX), JSON.stringify(config))
      .input('visibility', sql.NVarChar(16), visibility)
      .query(`
        UPDATE dbo.bi_charts
        SET name = @name, config_json = @configJson, visibility = @visibility, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.board_key, INSERTED.name,
               INSERTED.config_json, INSERTED.visibility, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id
      `);
    return res.json({ chart: mapChartRow(result.recordset[0]) });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/bi/charts/:id — alleen de eigenaar mag verwijderen.
router.delete('/charts/:id', param('id').isInt({ min: 1 }), async (req, res, next) => {
  try {
    if (validationError(req, res)) return undefined;
    const id = Number(req.params.id);
    const pool = await getSqlPool();
    const existing = await loadChart(pool, id);
    if (!existing) return res.status(404).json({ error: 'Chart not found' });
    if (Number(existing.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only the owner can delete this chart' });
    }
    await pool.request().input('id', sql.BigInt, id).query('DELETE FROM dbo.bi_charts WHERE id = @id');
    return res.json({ success: true, id });
  } catch (err) {
    return next(err);
  }
});

// GET /api/bi/meta/:boardKey — kolommen + welke number-kolommen als measure bruikbaar zijn.
router.get('/meta/:boardKey', async (req, res, next) => {
  try {
    const boardKey = String(req.params.boardKey || '').trim();
    if (!BOARD_KEY_PATTERN.test(boardKey)) return res.status(400).json({ error: 'Invalid board key' });
    const data = await time('bi_meta', () => dataService.read({ tableKey: boardKey, userId: req.user.id }));
    const columns = (data.meta?.columns?.master || []).map((c) => ({
      key: c.key,
      label: c.label,
      dataType: c.dataType,
    }));
    return res.json({
      boardKey,
      columns,
      measureColumns: columns.filter((c) => c.dataType === 'number').map((c) => c.key),
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/bi/aggregate — n charts in ÉÉN board-read (getimed als bi_aggregate).
router.post('/aggregate',
  body('boardKey').optional().matches(BOARD_KEY_PATTERN),
  body('charts').isArray({ min: 1, max: MAX_CHARTS_PER_AGGREGATE }),
  async (req, res, next) => {
    try {
      if (validationError(req, res)) return undefined;
      const boardKey = BOARD_KEY_PATTERN.test(String(req.body.boardKey || '')) ? req.body.boardKey : 'purchase-orders';
      const charts = req.body.charts.map(normalizeConfig);
      const output = await time('bi_aggregate', async () => {
        const data = await dataService.read({ tableKey: boardKey, userId: req.user.id });
        const columns = data.meta?.columns?.master || [];
        return aggregateCharts({ rows: data.rows || [], columns, charts });
      });
      return res.json(output);
    } catch (err) {
      return next(err);
    }
  });

module.exports = router;
