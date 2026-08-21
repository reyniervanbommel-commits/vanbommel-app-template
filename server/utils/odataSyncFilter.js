'use strict';

// Compileert gestructureerde sync-filterregels (admin-UI) naar een OData $filter-expressie
// voor de D365-call. Doel: minder data ophalen uit D365 zónder dat de admin ruwe
// OData-syntax hoeft te kennen — en zonder syntaxfouten zoals een losse enum-constante
// (bv. PurchStatus'Open' zonder veldvergelijking → 400 van D365).
//
// Regels kunnen op header- of regelniveau werken. Regel-niveau wordt vertaald naar een
// OData any()-lambda op de expanded collectie: PurchaseOrderLines/any(l: l/Field eq ...).

const OPERATORS = [
  'eq', 'ne', 'gt', 'ge', 'lt', 'le',
  'contains', 'notcontains', 'startswith', 'notstartswith', 'oneof',
];
const TEXT_FUNCTION_OPERATORS = ['contains', 'notcontains', 'startswith', 'notstartswith'];
const VALUE_TYPES = ['text', 'number', 'date', 'enum'];
const LEVELS = ['header', 'line'];
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENUM_NAMESPACE = 'Microsoft.Dynamics.DataEntities';
const LINES_NAV_PROPERTY = 'PurchaseOrderLines';
const MAX_RULES = 15;
const MAX_VALUE_LENGTH = 128;
// Opslaglimiet: de admin mag een lange PO-/vendor-lijst bewaren (tot 2500). D365-calls chunked de
// one-of waarden (D365_FILTER_CHUNK_SIZE) omdat F&O geen `in`-operator heeft en GET-$filter
// anders te lang wordt. Zie compileSyncRulesChunks.
const MAX_ONEOF_VALUES = 2500;
const D365_FILTER_CHUNK_SIZE = 20;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function escapeODataLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function listOneOfValues(rawValue) {
  const list = Array.isArray(rawValue)
    ? rawValue
    : String(rawValue ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  return [...new Set(list.map((v) => String(v)))];
}

// Serialiseert één waarde naar een OData-literal volgens het waardetype.
function serializeValue(rawValue, valueType, enumType, label) {
  if (valueType === 'enum') {
    const member = String(rawValue).trim();
    if (!IDENT_RE.test(member)) throw badRequest(`${label}: invalid enum value`);
    return `${ENUM_NAMESPACE}.${enumType}'${member}'`;
  }
  if (valueType === 'number') {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) throw badRequest(`${label}: value must be a number`);
    return String(num);
  }
  if (valueType === 'date') {
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) throw badRequest(`${label}: value must be a date`);
    return parsed.toISOString();
  }
  return `'${escapeODataLiteral(String(rawValue).trim())}'`;
}

// Valideert en compileert één regel naar een OData-clausule (zonder level-wrapping).
function compileRuleExpression(rule, fieldRef, label) {
  const operator = String(rule.operator || '').trim();
  const valueType = String(rule.valueType || 'text').trim();
  const rawValue = rule.value;

  if (!OPERATORS.includes(operator)) throw badRequest(`${label}: invalid operator`);
  if (!VALUE_TYPES.includes(valueType)) throw badRequest(`${label}: invalid value type`);

  let enumType = null;
  if (valueType === 'enum') {
    enumType = String(rule.enumType || '').trim();
    if (!IDENT_RE.test(enumType)) throw badRequest(`${label}: invalid enum type`);
    if (!['eq', 'ne', 'oneof'].includes(operator)) {
      throw badRequest(`${label}: enum fields only support equals/not equals/one-of`);
    }
  }
  if (TEXT_FUNCTION_OPERATORS.includes(operator) && valueType !== 'text') {
    throw badRequest(`${label}: this operator only applies to text fields`);
  }

  if (operator === 'oneof') {
    const list = listOneOfValues(rawValue);
    if (!list.length) throw badRequest(`${label}: at least one value is required`);
    if (list.length > MAX_ONEOF_VALUES) throw badRequest(`${label}: maximum ${MAX_ONEOF_VALUES} values`);
    for (const v of list) {
      if (String(v).length > MAX_VALUE_LENGTH) throw badRequest(`${label}: value is too long`);
    }
    const clauses = list.map((v) => `${fieldRef} eq ${serializeValue(v, valueType, enumType, label)}`);
    return clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`;
  }

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    throw badRequest(`${label}: value is required`);
  }
  if (String(rawValue).length > MAX_VALUE_LENGTH) throw badRequest(`${label}: value is too long`);

  if (TEXT_FUNCTION_OPERATORS.includes(operator)) {
    const literal = serializeValue(rawValue, 'text', null, label);
    const fn = operator.startsWith('not') ? operator.slice(3) : operator;
    const expr = `${fn}(${fieldRef},${literal})`;
    return operator.startsWith('not') ? `not ${expr}` : expr;
  }

  return `${fieldRef} ${operator} ${serializeValue(rawValue, valueType, enumType, label)}`;
}

// Compileert één regel inclusief level-wrapping (line-regels via any()-lambda).
function compileRule(rule, index) {
  const label = `Filter rule ${index + 1}`;
  if (!rule || typeof rule !== 'object') throw badRequest(`${label}: invalid rule`);

  const field = String(rule.field || '').trim();
  const level = String(rule.level || 'header').trim();
  if (!IDENT_RE.test(field)) throw badRequest(`${label}: invalid field`);
  if (!LEVELS.includes(level)) throw badRequest(`${label}: invalid level`);

  if (level === 'line') {
    const expression = compileRuleExpression(rule, `l/${field}`, label);
    return `${LINES_NAV_PROPERTY}/any(l: ${expression})`;
  }
  return compileRuleExpression(rule, field, label);
}

/**
 * Compileert een lijst regels naar één $filter-expressie (AND-gecombineerd).
 * Gooit een 400-fout bij ongeldige input; lege lijst → lege string.
 */
function compileSyncRules(rules) {
  if (!Array.isArray(rules) || !rules.length) return '';
  if (rules.length > MAX_RULES) throw badRequest(`Maximum ${MAX_RULES} filter rules`);
  const largeOneOfCount = rules.filter((rule) => (
    String(rule?.operator || '').trim() === 'oneof'
    && listOneOfValues(rule.value).length > D365_FILTER_CHUNK_SIZE
  )).length;
  if (largeOneOfCount > 1) {
    throw badRequest('Only one "is one of" filter can contain more than 20 values');
  }
  return rules.map(compileRule).join(' and ');
}

/**
 * Zelfde validatie als compileSyncRules, maar splitst één grote one-of-regel in
 * D365-veilige chunks (OR van max D365_FILTER_CHUNK_SIZE waarden).
 * Lege regels → [''].
 */
function compileSyncRulesChunks(rules, chunkSize = D365_FILTER_CHUNK_SIZE) {
  const compiled = compileSyncRules(rules);
  if (!compiled) return [''];
  const safeSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : D365_FILTER_CHUNK_SIZE;
  const largeIndexes = [];
  (Array.isArray(rules) ? rules : []).forEach((rule, index) => {
    if (String(rule?.operator || '').trim() !== 'oneof') return;
    if (listOneOfValues(rule.value).length > safeSize) largeIndexes.push(index);
  });
  if (!largeIndexes.length) return [compiled];
  if (largeIndexes.length > 1) {
    throw badRequest('Only one "is one of" filter can contain more than 20 values');
  }

  const largeIndex = largeIndexes[0];
  const largeRule = rules[largeIndex];
  const values = listOneOfValues(largeRule.value);
  const otherRules = rules.filter((_, index) => index !== largeIndex);
  const chunks = [];
  for (let offset = 0; offset < values.length; offset += safeSize) {
    const slice = values.slice(offset, offset + safeSize);
    chunks.push(compileSyncRules([
      ...otherRules,
      { ...largeRule, value: slice },
    ]));
  }
  return chunks;
}

/**
 * Parseert de opgeslagen JSON (PO_SYNC_RULES) defensief naar een regel-array.
 * Corrupte of lege JSON → lege lijst (sync draait dan ongefilterd door).
 */
function parseSyncRules(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const PO_FIELD_ALIASES = {
  PurchaseOrderStatus: ['status'],
  OrderVendorAccountNumber: ['vendorAccount'],
  PurchaseOrderNumber: ['orderNumber'],
};

function resolveRecordField(record, field) {
  const safe = record && typeof record === 'object' ? record : {};
  const key = String(field || '').trim();
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(safe, key)) return safe[key];
  for (const alias of PO_FIELD_ALIASES[key] || []) {
    if (Object.prototype.hasOwnProperty.call(safe, alias)) return safe[alias];
  }
  return null;
}

function normalizeRuleComparable(rawValue, valueType) {
  if (rawValue === null || rawValue === undefined) return null;
  if (valueType === 'enum') return String(rawValue).trim();
  if (valueType === 'number') {
    const num = Number(rawValue);
    return Number.isFinite(num) ? num : null;
  }
  if (valueType === 'date') {
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  return String(rawValue).trim().toLowerCase();
}

function compareRuleValues(left, operator, right, valueType) {
  const a = normalizeRuleComparable(left, valueType);
  const b = normalizeRuleComparable(right, valueType);
  if (a === null || b === null) return false;
  if (valueType === 'number' || valueType === 'date') {
    if (operator === 'eq') return a === b;
    if (operator === 'ne') return a !== b;
    if (operator === 'gt') return a > b;
    if (operator === 'ge') return a >= b;
    if (operator === 'lt') return a < b;
    if (operator === 'le') return a <= b;
    return false;
  }
  if (operator === 'eq') return a === b;
  if (operator === 'ne') return a !== b;
  if (operator === 'contains') return a.includes(b);
  if (operator === 'notcontains') return !a.includes(b);
  if (operator === 'startswith') return a.startsWith(b);
  if (operator === 'notstartswith') return !a.startsWith(b);
  return false;
}

function evaluateRuleExpression(rule, rawFieldValue) {
  const operator = String(rule.operator || '').trim();
  const valueType = String(rule.valueType || 'text').trim();
  const rawValue = rule.value;

  if (operator === 'oneof') {
    const list = listOneOfValues(rawValue);
    return list.some((entry) => compareRuleValues(rawFieldValue, 'eq', entry, valueType));
  }

  return compareRuleValues(rawFieldValue, operator, rawValue, valueType);
}

function evaluateSyncRule(rule, headerRecord, lineRecords) {
  const level = String(rule?.level || 'header').trim();
  const field = String(rule?.field || '').trim();
  if (!field) return true;
  if (level === 'line') {
    const lines = Array.isArray(lineRecords) ? lineRecords : [];
    return lines.some((line) => evaluateRuleExpression(rule, resolveRecordField(line, field)));
  }
  return evaluateRuleExpression(rule, resolveRecordField(headerRecord, field));
}

/**
 * Evalueert opgeslagen sync-regels tegen gecachte header-/regel-JSON (tb_cache.data_json).
 * Lege regels → true (geen filter actief).
 */
function recordMatchesSyncRules(rules, headerRecord, lineRecords) {
  if (!Array.isArray(rules) || !rules.length) return true;
  return rules.every((rule) => evaluateSyncRule(rule, headerRecord, lineRecords));
}

module.exports = {
  OPERATORS,
  VALUE_TYPES,
  LEVELS,
  MAX_RULES,
  MAX_ONEOF_VALUES,
  D365_FILTER_CHUNK_SIZE,
  compileSyncRules,
  compileSyncRulesChunks,
  parseSyncRules,
  recordMatchesSyncRules,
};
