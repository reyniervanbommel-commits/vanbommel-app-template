'use strict';

const sql = require('mssql');

const DEFAULT_SQL_REQUEST_TIMEOUT_MS = 120000;
const DEFAULT_SQL_CONNECTION_TIMEOUT_MS = 15000;

function parsePositiveInt(rawValue, fallbackValue) {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function getSqlTimeoutConfig() {
  return {
    requestTimeout: parsePositiveInt(process.env.SQL_REQUEST_TIMEOUT_MS, DEFAULT_SQL_REQUEST_TIMEOUT_MS),
    connectionTimeout: parsePositiveInt(process.env.SQL_CONNECTION_TIMEOUT_MS, DEFAULT_SQL_CONNECTION_TIMEOUT_MS),
  };
}

async function getSqlPool() {
  const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
  const { requestTimeout, connectionTimeout } = getSqlTimeoutConfig();

  if (pool && pool.config) {
    pool.config.requestTimeout = requestTimeout;
    pool.config.connectionTimeout = connectionTimeout;
    if (pool.config.options && typeof pool.config.options === 'object') {
      pool.config.options.requestTimeout = requestTimeout;
      pool.config.options.connectionTimeout = connectionTimeout;
    }
  }

  return pool;
}

module.exports = {
  DEFAULT_SQL_REQUEST_TIMEOUT_MS,
  DEFAULT_SQL_CONNECTION_TIMEOUT_MS,
  getSqlTimeoutConfig,
  getSqlPool,
};
