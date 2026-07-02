'use strict';

// Compileert gestructureerde sync-filterregels (admin-UI) naar een OData $filter-expressie
// voor de D365-call. Doel: minder data ophalen uit D365 zónder dat de admin ruwe
// OData-syntax hoeft te kennen — en zonder syntaxfouten zoals een losse enum-constante
// (bv. PurchStatus'Open' zonder veldvergelijking → 400 van D365).

const OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'contains'];
const VALUE_TYPES = ['text', 'number', 'date', 'enum'];
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENUM_NAMESPACE = 'Microsoft.Dynamics.DataEntities';
const MAX_RULES = 10;
const MAX_VALUE_LENGTH = 128;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function escapeODataLiteral(value) {
  return String(value).replace(/'/g, "''");
}

// Valideert en compileert één regel naar een OData-clausule.
function compileRule(rule, index) {
  const label = `Filterregel ${index + 1}`;
  if (!rule || typeof rule !== 'object') throw badRequest(`${label}: ongeldige regel`);

  const field = String(rule.field || '').trim();
  const operator = String(rule.operator || '').trim();
  const valueType = String(rule.valueType || 'text').trim();
  const rawValue = rule.value;

  if (!IDENT_RE.test(field)) throw badRequest(`${label}: ongeldig veld`);
  if (!OPERATORS.includes(operator)) throw badRequest(`${label}: ongeldige operator`);
  if (!VALUE_TYPES.includes(valueType)) throw badRequest(`${label}: ongeldig waardetype`);
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    throw badRequest(`${label}: waarde is verplicht`);
  }
  if (String(rawValue).length > MAX_VALUE_LENGTH) {
    throw badRequest(`${label}: waarde is te lang`);
  }

  if (valueType === 'enum') {
    // Enum-vergelijking: Field eq Microsoft.Dynamics.DataEntities.EnumType'Member'
    const enumType = String(rule.enumType || '').trim();
    const member = String(rawValue).trim();
    if (!IDENT_RE.test(enumType)) throw badRequest(`${label}: ongeldig enum-type`);
    if (!IDENT_RE.test(member)) throw badRequest(`${label}: ongeldige enum-waarde`);
    if (operator !== 'eq' && operator !== 'ne') {
      throw badRequest(`${label}: enum-velden ondersteunen alleen 'is' of 'is niet'`);
    }
    return `${field} ${operator} ${ENUM_NAMESPACE}.${enumType}'${member}'`;
  }

  if (valueType === 'number') {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) throw badRequest(`${label}: waarde moet een getal zijn`);
    if (operator === 'contains') throw badRequest(`${label}: 'bevat' geldt alleen voor tekst`);
    return `${field} ${operator} ${num}`;
  }

  if (valueType === 'date') {
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) throw badRequest(`${label}: waarde moet een datum zijn`);
    if (operator === 'contains') throw badRequest(`${label}: 'bevat' geldt alleen voor tekst`);
    return `${field} ${operator} ${parsed.toISOString()}`;
  }

  // text
  const escaped = escapeODataLiteral(String(rawValue).trim());
  if (operator === 'contains') return `contains(${field},'${escaped}')`;
  return `${field} ${operator} '${escaped}'`;
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

module.exports = { OPERATORS, VALUE_TYPES, MAX_RULES, compileSyncRules, parseSyncRules };
