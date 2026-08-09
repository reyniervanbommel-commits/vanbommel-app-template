'use strict';

// Herbruikbare mock voor een mssql-pool/request, voor services die via
// getSqlPool() (server/utils/sqlPool.js) queries uitvoeren. Geef een lijst
// `queries` mee — elke opeenvolgende `.query()`/`.batch()`-call op de
// request krijgt het volgende resultaat uit die lijst (default: lege recordset).
//
// Gebruik: vi.mock('../utils/sqlPool', () => ({ getSqlPool: async () => pool }))
function createMockPool({ queries = [] } = {}) {
  const calls = [];
  let queryIndex = 0;
  let pendingInputs = {};

  const request = {
    input(name, typeOrValue, maybeValue) {
      pendingInputs[name] = maybeValue === undefined ? typeOrValue : maybeValue;
      return request;
    },
    async query(sqlText) {
      calls.push({ sql: sqlText, inputs: pendingInputs });
      pendingInputs = {};
      const result = queries[queryIndex] !== undefined ? queries[queryIndex] : { recordset: [] };
      queryIndex += 1;
      return result;
    },
    async batch(sqlText) {
      return request.query(sqlText);
    },
  };

  return {
    request: () => request,
    calls,
  };
}

module.exports = { createMockPool };
