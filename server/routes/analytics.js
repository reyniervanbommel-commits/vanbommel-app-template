'use strict';

const express = require('express');
const sql = require('mssql');
const router = express.Router();

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
}

function dateParams(request, query) {
  const { startDate, endDate, userId } = query;
  let where = 'WHERE 1=1';
  if (startDate) { where += ' AND CAST(created_at AS DATE) >= @startDate'; request.input('startDate', sql.Date, startDate); }
  if (endDate)   { where += ' AND CAST(created_at AS DATE) <= @endDate';   request.input('endDate',   sql.Date, endDate);   }
  if (userId)    { where += ' AND user_id = @userId';                       request.input('userId',    sql.Int,  parseInt(userId)); }
  return where;
}

// Pagina-gebruik per pagina
router.get('/page-usage', async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const where = dateParams(request, req.query);
    const result = await request.query(`
      SELECT page_name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS unique_users
      FROM dbo.user_page_views ${where}
      GROUP BY page_name ORDER BY count DESC`);
    res.json({ stats: result.recordset });
  } catch (err) { next(err); }
});

// Sessiestatistieken (gebaseerd op auth_events login/logout)
router.get('/sessions', async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const where = dateParams(request, req.query);
    const result = await request.query(`
      SELECT
        COUNT(*) AS total_sessions,
        AVG(CAST(duration_seconds AS FLOAT)) AS avg_duration_seconds,
        MIN(duration_seconds) AS min_duration_seconds,
        MAX(duration_seconds) AS max_duration_seconds
      FROM dbo.user_sessions_log ${where}`);
    res.json(result.recordset[0] || { total_sessions: 0 });
  } catch (err) { next(err); }
});

// Login-statistieken per dag
router.get('/login-stats', async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    let where = 'WHERE event_type = \'LOGIN_SUCCESS\'';
    const { startDate, endDate, userId } = req.query;
    if (startDate) { where += ' AND CAST(created_at AS DATE) >= @startDate'; request.input('startDate', sql.Date, startDate); }
    if (endDate)   { where += ' AND CAST(created_at AS DATE) <= @endDate';   request.input('endDate',   sql.Date, endDate);   }
    if (userId)    { where += ' AND user_id = @userId';                       request.input('userId',    sql.Int,  parseInt(userId)); }
    const result = await request.query(`
      SELECT CAST(created_at AS DATE) AS date, COUNT(*) AS count
      FROM dbo.auth_events ${where}
      GROUP BY CAST(created_at AS DATE) ORDER BY date`);
    res.json({ by_day: result.recordset });
  } catch (err) { next(err); }
});

// Login-statistieken per gebruiker
router.get('/user-login-stats', async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    let where = 'WHERE event_type = \'LOGIN_SUCCESS\'';
    const { startDate, endDate } = req.query;
    if (startDate) { where += ' AND CAST(ae.created_at AS DATE) >= @startDate'; request.input('startDate', sql.Date, startDate); }
    if (endDate)   { where += ' AND CAST(ae.created_at AS DATE) <= @endDate';   request.input('endDate',   sql.Date, endDate);   }
    const result = await request.query(`
      SELECT u.email AS user_email, COUNT(*) AS login_count
      FROM dbo.auth_events ae
      LEFT JOIN dbo.users u ON u.id = ae.user_id
      ${where} GROUP BY u.email ORDER BY login_count DESC`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// Pagina-gebruik per gebruiker
router.get('/click-stats', async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    const where = dateParams(request, req.query);
    const result = await request.query(`
      SELECT page_name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS unique_users, 'page-view' AS element_type
      FROM dbo.user_page_views ${where}
      GROUP BY page_name ORDER BY count DESC`);
    res.json({ stats: result.recordset });
  } catch (err) { next(err); }
});

module.exports = router;
