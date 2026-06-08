'use strict';

/**
 * Zet ADO-style connection string om naar mssql config voor connect-mssql-v2.
 * @param {string} connectionString
 * @returns {import('mssql').config}
 */
function parseSqlConnectionString(connectionString) {
  const entries = (connectionString || '')
    .split(';')
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return null;
      return [part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1)];
    })
    .filter(Boolean);

  const map = Object.fromEntries(entries);
  const serverParts = (map.server || 'localhost').split(',');

  return {
    user: map['user id'] || map.user,
    password: map.password,
    server: serverParts[0],
    ...(serverParts[1] ? { port: parseInt(serverParts[1], 10) } : {}),
    database: map.database,
    options: {
      encrypt: String(map.encrypt || 'false').toLowerCase() === 'true',
    },
  };
}

module.exports = { parseSqlConnectionString };
