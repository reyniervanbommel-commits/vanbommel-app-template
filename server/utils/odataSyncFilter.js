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
const MAX_ONEOF_VALUES = 20;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function escapeODataLiteral(value) {
  return String(value).replace(/'/g, "''");
}

// Serialiseert één waarde naar een OData-literal volgens het waardetype.
function serializeValue(rawValue, valueType, enumType, label) {
  if (valueType === 'enum') {
    const member = String(rawValue).trim();
    if (!IDENT_RE.test(member)) throw badRequest(`${label}: ongeldige enum-waarde`);
    return `${ENUM_NAMESPACE}.${enumType}'${member}'`;
  }
  if (valueType === 'number') {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) throw badRequest(`${label}: waarde moet een getal zijn`);
    return String(num);
  }
  if (valueType === 'date') {
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) throw badRequest(`${label}: waarde moet een datum zijn`);
    return parsed.toISOString();
  }
  return `'${escapeODataLiteral(String(rawValue).trim())}'`;
}

// Valideert en compileert één regel naar een OData-clausule (zonder level-wrapping).
function compileRuleExpression(rule, fieldRef, label) {
  const operator = String(rule.operator || '').trim();
  const valueType = String(rule.valueType || 'text').trim();
  const rawValue = rule.value;

  if (!OPERATORS.includes(operator)) throw badRequest(`${label}: ongeldige operator`);
  if (!VALUE_TYPES.includes(valueType)) throw badRequest(`${label}: ongeldig waardetype`);

  let enumType = null;
  if (valueType === 'enum') {
    enumType = String(rule.enumType || '').trim();
    if (!IDENT_RE.test(enumType)) throw badRequest(`${label}: ongeldig enum-type`);
    if (!['eq', 'ne', 'oneof'].includes(operator)) {
      throw badRequest(`${label}: enum-velden ondersteunen alleen gelijk/ongelijk/één-van`);
    }
  }
  if (TEXT_FUNCTION_OPERATORS.includes(operator) && valueType !== 'text') {
    throw badRequest(`${label}: deze operator geldt alleen voor tekstvelden`);
  }

  if (operator === 'oneof') {
    const list = Array.isArray(rawValue)
      ? rawValue
      : String(rawValue ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    if (!list.length) throw badRequest(`${label}: minimaal één waarde vereist`);
    if (list.length > MAX_ONEOF_VALUES) throw badRequest(`${label}: maximaal ${MAX_ONEOF_VALUES} waarden`);
    for (const v of list) {
      if (String(v).length > MAX_VALUE_LENGTH) throw badRequest(`${label}: waarde is te lang`);
    }
    const clauses = list.map((v) => `${fieldRef} eq ${serializeValue(v, valueType, enumType, label)}`);
    return clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`;
  }

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    throw badRequest(`${label}: waarde is verplicht`);
  }
  if (String(rawValue).length > MAX_VALUE_LENGTH) throw badRequest(`${label}: waarde is te lang`);

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
  const label = `Filterregel ${index + 1}`;
  if (!rule || typeof rule !== 'object') throw badRequest(`${label}: ongeldige regel`);

  const field = String(rule.field || '').trim();
  const level = String(rule.level || 'header').trim();
  if (!IDENT_RE.test(field)) throw badRequest(`${label}: ongeldig veld`);
  if (!LEVELS.includes(level)) throw badRequest(`${label}: ongeldig niveau`);

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
  if (rules.length > MAX_RULES) throw badRequest(`Maximaal ${MAX_RULES} filterregels`);
  return rules.map(compileRule).join(' and ');
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

module.exports = { OPERATORS, VALUE_TYPES, LEVELS, MAX_RULES, compileSyncRules, parseSyncRules };
