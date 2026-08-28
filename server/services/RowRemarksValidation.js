'use strict';

const ALLOWED_EMOJIS = Object.freeze(['👍', '😊', '🎉', '❤️', '😂', '😮']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const SEARCH_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeTableKey(value) {
  if (typeof value !== 'string') throw badRequest('Invalid table key');
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(normalized)) {
    throw badRequest('Invalid table key');
  }
  return normalized;
}

function normalizeRowIdentity(partitionKey, recordKey) {
  if (typeof partitionKey !== 'string' || typeof recordKey !== 'string') {
    throw badRequest('partitionKey and recordKey are required');
  }
  const partition = partitionKey.trim();
  const record = recordKey.trim();
  if (!partition || !record || partition.length > 32 || record.length > 128) {
    throw badRequest('Invalid partitionKey or recordKey');
  }
  if (CONTROL_CHARACTERS.test(partition) || CONTROL_CHARACTERS.test(record)) {
    throw badRequest('Invalid partitionKey or recordKey');
  }
  return { partitionKey: partition, recordKey: record };
}

function normalizeBody(value) {
  if (typeof value !== 'string') throw badRequest('Remark text is required');
  const body = value.normalize('NFC').trim();
  if (!body || body.length > 2000 || CONTROL_CHARACTERS.test(body)) {
    throw badRequest('Remark text must contain 1 to 2000 valid characters');
  }
  return body;
}

function normalizeSearchQuery(value) {
  if (typeof value !== 'string') throw badRequest('Search text is required');
  const query = value.normalize('NFC').trim();
  if (query.length < 2 || query.length > 200 || SEARCH_CONTROL_CHARACTERS.test(query)) {
    throw badRequest('Search text must contain 2 to 200 valid characters');
  }
  return query;
}

function normalizePositiveId(value, fieldName) {
  const raw = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(raw)) throw badRequest(`Invalid ${fieldName}`);
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw badRequest(`Invalid ${fieldName}`);
  return id;
}

function normalizeOptionalColumnId(value) {
  return value === undefined || value === null || value === ''
    ? null
    : normalizePositiveId(value, 'columnId');
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const limit = normalizePositiveId(value, 'limit');
  if (limit > MAX_LIMIT) throw badRequest(`limit must be at most ${MAX_LIMIT}`);
  return limit;
}

function encodeCursor(row) {
  if (!row) return null;
  return Buffer.from(JSON.stringify({
    createdAt: new Date(row.created_at).toISOString(),
    id: Number(row.id),
  })).toString('base64url');
}

function normalizeCursor(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 256) throw badRequest('Invalid cursor');
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const createdAt = new Date(parsed.createdAt);
    const id = normalizePositiveId(parsed.id, 'cursor');
    if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== parsed.createdAt) {
      throw new Error('invalid date');
    }
    return { createdAt, id };
  } catch {
    throw badRequest('Invalid cursor');
  }
}

function normalizeEmoji(value) {
  if (typeof value !== 'string' || !ALLOWED_EMOJIS.includes(value)) {
    throw badRequest('Invalid emoji');
  }
  return value;
}

function normalizeActive(value) {
  if (typeof value !== 'boolean') throw badRequest('active must be a boolean');
  return value;
}

module.exports = {
  ALLOWED_EMOJIS,
  encodeCursor,
  normalizeActive,
  normalizeBody,
  normalizeCursor,
  normalizeEmoji,
  normalizeLimit,
  normalizeOptionalColumnId,
  normalizePositiveId,
  normalizeRowIdentity,
  normalizeSearchQuery,
  normalizeTableKey,
};
