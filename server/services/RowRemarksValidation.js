'use strict';

const ALLOWED_EMOJIS = Object.freeze(['👍', '😊', '🎉', '❤️', '😂', '😮']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeTableKey(value) {
  if (typeof value !== 'string') throw badRequest('Ongeldige tabelsleutel');
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(normalized)) {
    throw badRequest('Ongeldige tabelsleutel');
  }
  return normalized;
}

function normalizeRowIdentity(partitionKey, recordKey) {
  if (typeof partitionKey !== 'string' || typeof recordKey !== 'string') {
    throw badRequest('partitionKey en recordKey zijn verplicht');
  }
  const partition = partitionKey.trim();
  const record = recordKey.trim();
  if (!partition || !record || partition.length > 32 || record.length > 128) {
    throw badRequest('Ongeldige partitionKey of recordKey');
  }
  if (CONTROL_CHARACTERS.test(partition) || CONTROL_CHARACTERS.test(record)) {
    throw badRequest('Ongeldige partitionKey of recordKey');
  }
  return { partitionKey: partition, recordKey: record };
}

function normalizeBody(value) {
  if (typeof value !== 'string') throw badRequest('Remarktekst is verplicht');
  const body = value.normalize('NFC').trim();
  if (!body || body.length > 2000 || CONTROL_CHARACTERS.test(body)) {
    throw badRequest('Remarktekst moet 1 tot en met 2000 geldige tekens bevatten');
  }
  return body;
}

function normalizePositiveId(value, fieldName) {
  const raw = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(raw)) throw badRequest(`Ongeldige ${fieldName}`);
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw badRequest(`Ongeldige ${fieldName}`);
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
  if (limit > MAX_LIMIT) throw badRequest(`limit mag maximaal ${MAX_LIMIT} zijn`);
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
  if (typeof value !== 'string' || value.length > 256) throw badRequest('Ongeldige cursor');
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const createdAt = new Date(parsed.createdAt);
    const id = normalizePositiveId(parsed.id, 'cursor');
    if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== parsed.createdAt) {
      throw new Error('invalid date');
    }
    return { createdAt, id };
  } catch {
    throw badRequest('Ongeldige cursor');
  }
}

function normalizeEmoji(value) {
  if (typeof value !== 'string' || !ALLOWED_EMOJIS.includes(value)) {
    throw badRequest('Ongeldige emoji');
  }
  return value;
}

function normalizeActive(value) {
  if (typeof value !== 'boolean') throw badRequest('active moet een boolean zijn');
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
  normalizeTableKey,
};
