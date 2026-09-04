'use strict';

const { escapeODataLiteral } = require('../services/D365ODataService');

function chunkList(values, size) {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 20;
  const list = Array.isArray(values) ? values : [];
  const chunks = [];
  for (let index = 0; index < list.length; index += safeSize) {
    chunks.push(list.slice(index, index + safeSize));
  }
  return chunks;
}

function combineODataFilters(baseFilter, extraFilter) {
  const base = String(baseFilter || '').trim();
  const extra = String(extraFilter || '').trim();
  if (!base) return extra;
  if (!extra) return base;
  return `(${base}) and (${extra})`;
}

function buildOneOfFilterClause(field, values) {
  const normalizedField = String(field || '').trim();
  const list = [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
  if (!normalizedField || !list.length) return '';
  if (list.length === 1) {
    return `${normalizedField} eq '${escapeODataLiteral(list[0])}'`;
  }
  return `(${list.map((value) => `${normalizedField} eq '${escapeODataLiteral(value)}'`).join(' or ')})`;
}

module.exports = {
  chunkList,
  combineODataFilters,
  buildOneOfFilterClause,
};
