'use strict';

/**
 * Query-param planningDate voor RCCP analysis (requested | confirmed).
 */

function parsePlanningDate(raw, config) {
  const value = raw == null ? '' : String(raw).trim();
  if (!value) return 'requested';
  if (value === 'requested') return 'requested';
  if (value === 'confirmed') {
    if (!String(config?.confirmedDateColumnKey || '').trim()) {
      const err = new Error('planningDate=confirmed requires a confirmed date column');
      err.status = 400;
      throw err;
    }
    return 'confirmed';
  }
  const err = new Error('planningDate must be requested or confirmed');
  err.status = 400;
  throw err;
}

module.exports = { parsePlanningDate };
