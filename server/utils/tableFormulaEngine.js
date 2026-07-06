'use strict';

const MAX_FORMULA_LENGTH = 2000;
const MAX_TOKENS = 1024;
const MAX_EVAL_DEPTH = 64;

const TOKEN_TYPES = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENT: 'IDENT',
  OP: 'OP',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  SEMI: 'SEMI',
  EOF: 'EOF',
};

class FormulaSyntaxError extends Error {
  constructor(message, position = null) {
    super(position === null ? message : `${message} (positie ${position})`);
    this.name = 'FormulaSyntaxError';
    this.position = position;
  }
}

function isNumericString(value) {
  if (typeof value !== 'string') return false;
  return /^[-+]?\d+(\.\d+)?$/.test(value.trim());
}

function tokenize(input) {
  const text = String(input || '');
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: ch, position: i });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ch, position: i });
      i += 1;
      continue;
    }
    if (ch === ';') {
      tokens.push({ type: TOKEN_TYPES.SEMI, value: ch, position: i });
      i += 1;
      continue;
    }

    const twoChar = text.slice(i, i + 2);
    if (twoChar === '>=' || twoChar === '<=' || twoChar === '<>') {
      tokens.push({ type: TOKEN_TYPES.OP, value: twoChar, position: i });
      i += 2;
      continue;
    }
    if ('+-*/><='.includes(ch)) {
      tokens.push({ type: TOKEN_TYPES.OP, value: ch, position: i });
      i += 1;
      continue;
    }

    if (ch === "'") {
      let out = '';
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "'" && text[j + 1] === "'") {
          out += "'";
          j += 2;
          continue;
        }
        if (text[j] === "'") {
          break;
        }
        out += text[j];
        j += 1;
      }
      if (j >= text.length || text[j] !== "'") {
        throw new FormulaSyntaxError('String-literal is niet afgesloten', i);
      }
      tokens.push({ type: TOKEN_TYPES.STRING, value: out, position: i });
      i = j + 1;
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(text[i + 1]))) {
      let j = i;
      let dotCount = 0;
      while (j < text.length && /[\d.]/.test(text[j])) {
        if (text[j] === '.') dotCount += 1;
        j += 1;
      }
      if (dotCount > 1) {
        throw new FormulaSyntaxError('Ongeldig getal', i);
      }
      const raw = text.slice(i, j);
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        throw new FormulaSyntaxError('Ongeldig getal', i);
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: num, position: i });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j += 1;
      tokens.push({ type: TOKEN_TYPES.IDENT, value: text.slice(i, j), position: i });
      i = j;
      continue;
    }

    throw new FormulaSyntaxError(`Onbekend teken '${ch}'`, i);
  }

  if (tokens.length > MAX_TOKENS) {
    throw new FormulaSyntaxError(`Formule bevat te veel tokens (max ${MAX_TOKENS})`);
  }
  tokens.push({ type: TOKEN_TYPES.EOF, value: '', position: text.length });
  return tokens;
}

function createParser(tokens) {
  let pos = 0;
  let parenDepth = 0;

  function current() {
    return tokens[pos];
  }

  function peek(offset = 1) {
    return tokens[pos + offset] || tokens[tokens.length - 1];
  }

  function consume(type = null, value = null) {
    const token = current();
    if (type && token.type !== type) {
      throw new FormulaSyntaxError(`Verwacht ${type}, kreeg ${token.type}`, token.position);
    }
    if (value && token.value !== value) {
      throw new FormulaSyntaxError(`Verwacht '${value}', kreeg '${token.value}'`, token.position);
    }
    pos += 1;
    return token;
  }

  function parseExpression() {
    return parseComparison();
  }

  function parseComparison() {
    let node = parseAdditive();
    while (current().type === TOKEN_TYPES.OP && ['>', '<', '>=', '<=', '=', '<>'].includes(current().value)) {
      const op = consume(TOKEN_TYPES.OP).value;
      const right = parseAdditive();
      node = { type: 'binary', op, left: node, right };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (current().type === TOKEN_TYPES.OP && (current().value === '+' || current().value === '-')) {
      const op = consume(TOKEN_TYPES.OP).value;
      const right = parseMultiplicative();
      node = { type: 'binary', op, left: node, right };
    }
    return node;
  }

  function parseMultiplicative() {
    let node = parseUnary();
    while (current().type === TOKEN_TYPES.OP && (current().value === '*' || current().value === '/')) {
      const op = consume(TOKEN_TYPES.OP).value;
      const right = parseUnary();
      node = { type: 'binary', op, left: node, right };
    }
    return node;
  }

  function parseUnary() {
    if (current().type === TOKEN_TYPES.OP && (current().value === '+' || current().value === '-')) {
      const op = consume(TOKEN_TYPES.OP).value;
      return { type: 'unary', op, argument: parseUnary() };
    }
    return parsePrimary();
  }

  function parseArguments() {
    const args = [];
    if (current().type === TOKEN_TYPES.RPAREN) return args;
    args.push(parseExpression());
    while (current().type === TOKEN_TYPES.SEMI) {
      consume(TOKEN_TYPES.SEMI);
      args.push(parseExpression());
    }
    return args;
  }

  function parsePrimary() {
    const token = current();
    if (token.type === TOKEN_TYPES.NUMBER) {
      consume(TOKEN_TYPES.NUMBER);
      return { type: 'number', value: token.value };
    }
    if (token.type === TOKEN_TYPES.STRING) {
      consume(TOKEN_TYPES.STRING);
      return { type: 'string', value: token.value };
    }
    if (token.type === TOKEN_TYPES.IDENT) {
      const ident = consume(TOKEN_TYPES.IDENT).value;
      if (current().type === TOKEN_TYPES.LPAREN) {
        consume(TOKEN_TYPES.LPAREN);
        const args = parseArguments();
        consume(TOKEN_TYPES.RPAREN);
        return { type: 'call', name: ident.toUpperCase(), args };
      }
      throw new FormulaSyntaxError(`Onbekende identifier '${ident}'`, token.position);
    }
    if (token.type === TOKEN_TYPES.LPAREN) {
      parenDepth += 1;
      if (parenDepth > MAX_EVAL_DEPTH) {
        throw new FormulaSyntaxError(`Nesting te diep (max ${MAX_EVAL_DEPTH})`, token.position);
      }
      consume(TOKEN_TYPES.LPAREN);
      if (current().type === TOKEN_TYPES.IDENT && peek().type === TOKEN_TYPES.RPAREN) {
        const key = consume(TOKEN_TYPES.IDENT).value;
        consume(TOKEN_TYPES.RPAREN);
        parenDepth -= 1;
        return { type: 'ref', key };
      }
      const expr = parseExpression();
      consume(TOKEN_TYPES.RPAREN);
      parenDepth -= 1;
      return expr;
    }
    throw new FormulaSyntaxError(`Onverwachte token '${token.type}'`, token.position);
  }

  return {
    parse() {
      const ast = parseExpression();
      consume(TOKEN_TYPES.EOF);
      return ast;
    },
  };
}

function normalizeFormulaInput(expression) {
  let normalized = String(expression || '').trim();
  if (!normalized) {
    throw new FormulaSyntaxError('Formule is verplicht');
  }
  if (normalized.length > MAX_FORMULA_LENGTH) {
    throw new FormulaSyntaxError(`Formule is te lang (max ${MAX_FORMULA_LENGTH} tekens)`);
  }
  if (normalized.startsWith('=')) normalized = normalized.slice(1).trim();
  if (!normalized) {
    throw new FormulaSyntaxError('Formule is verplicht');
  }
  return normalized;
}

function collectReferences(node, refs = new Set()) {
  if (!node || typeof node !== 'object') return refs;
  if (node.type === 'ref') refs.add(String(node.key).toLowerCase());
  if (node.type === 'binary') {
    collectReferences(node.left, refs);
    collectReferences(node.right, refs);
  } else if (node.type === 'unary') {
    collectReferences(node.argument, refs);
  } else if (node.type === 'call') {
    for (const arg of node.args) collectReferences(arg, refs);
  }
  return refs;
}

function compileFormula(expression) {
  const normalized = normalizeFormulaInput(expression);
  const tokens = tokenize(normalized);
  const parser = createParser(tokens);
  const ast = parser.parse();
  return {
    expression: normalized,
    ast,
    references: collectReferences(ast),
  };
}

function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || typeof value === 'boolean') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getTime());
  if (typeof value === 'string' && isNumericString(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toNumericOperand(value, label = 'Waarde') {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} is geen geldig getal`);
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && isNumericString(value)) return Number(value.trim());
  throw new Error(`${label} kan niet als getal worden gebruikt`);
}

function toBoolean(value) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['true', 'waar', 'ja', '1'].includes(normalized)) return true;
    if (['false', 'onwaar', 'nee', '0'].includes(normalized)) return false;
    return true;
  }
  return true;
}

function compareValues(left, right, op) {
  const leftDate = toDateOrNull(left);
  const rightDate = toDateOrNull(right);

  let cmp = 0;
  if (leftDate && rightDate) {
    cmp = leftDate.getTime() - rightDate.getTime();
  } else if (isNumericString(String(left ?? '')) || isNumericString(String(right ?? '')) || left === null || left === undefined || right === null || right === undefined || typeof left === 'number' || typeof right === 'number' || typeof left === 'boolean' || typeof right === 'boolean') {
    cmp = toNumericOperand(left, 'Linkerwaarde') - toNumericOperand(right, 'Rechterwaarde');
  } else {
    const leftText = left === null || left === undefined ? '' : String(left);
    const rightText = right === null || right === undefined ? '' : String(right);
    cmp = leftText.localeCompare(rightText);
  }

  if (op === '=') return cmp === 0;
  if (op === '<>') return cmp !== 0;
  if (op === '>') return cmp > 0;
  if (op === '<') return cmp < 0;
  if (op === '>=') return cmp >= 0;
  if (op === '<=') return cmp <= 0;
  throw new Error(`Onbekende comparator '${op}'`);
}

function daysBetween(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startDate.getTime() - endDate.getTime()) / msPerDay);
}

function addDays(date, amount) {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + amount);
  return out;
}

function evalNode(node, rowValues, depth = 0) {
  if (!node || typeof node !== 'object') throw new Error('Ongeldige formule-node');
  if (depth > MAX_EVAL_DEPTH) throw new Error(`Evaluatie te diep (max ${MAX_EVAL_DEPTH})`);

  if (node.type === 'number') return node.value;
  if (node.type === 'string') return node.value;
  if (node.type === 'ref') {
    const key = String(node.key);
    if (!Object.prototype.hasOwnProperty.call(rowValues || {}, key)) {
      throw new Error(`Onbekende kolomreferentie '${key}'`);
    }
    return rowValues[key];
  }
  if (node.type === 'unary') {
    const value = evalNode(node.argument, rowValues, depth + 1);
    if (node.op === '+') return toNumericOperand(value, 'Unary plus');
    if (node.op === '-') return -toNumericOperand(value, 'Unary min');
    throw new Error(`Onbekende unary operator '${node.op}'`);
  }
  if (node.type === 'call') {
    if (node.name !== 'ALS') throw new Error(`Onbekende functie '${node.name}'`);
    if (!Array.isArray(node.args) || node.args.length !== 3) {
      throw new Error('ALS verwacht precies 3 argumenten');
    }
    const condition = evalNode(node.args[0], rowValues, depth + 1);
    return toBoolean(condition)
      ? evalNode(node.args[1], rowValues, depth + 1)
      : evalNode(node.args[2], rowValues, depth + 1);
  }
  if (node.type === 'binary') {
    const left = evalNode(node.left, rowValues, depth + 1);
    const right = evalNode(node.right, rowValues, depth + 1);

    if (['=', '<>', '>', '<', '>=', '<='].includes(node.op)) {
      return compareValues(left, right, node.op);
    }

    if (node.op === '+' || node.op === '-') {
      const leftDate = toDateOrNull(left);
      const rightDate = toDateOrNull(right);
      if (leftDate && rightDate && node.op === '-') {
        return daysBetween(leftDate, rightDate);
      }
      if (leftDate && !rightDate) {
        return addDays(leftDate, node.op === '+' ? toNumericOperand(right) : -toNumericOperand(right));
      }
      if (rightDate && !leftDate && node.op === '+') {
        return addDays(rightDate, toNumericOperand(left));
      }
      const leftNumber = toNumericOperand(left, 'Linker operand');
      const rightNumber = toNumericOperand(right, 'Rechter operand');
      return node.op === '+' ? leftNumber + rightNumber : leftNumber - rightNumber;
    }

    if (node.op === '*') {
      return toNumericOperand(left, 'Linker operand') * toNumericOperand(right, 'Rechter operand');
    }
    if (node.op === '/') {
      const divisor = toNumericOperand(right, 'Rechter operand');
      if (divisor === 0) throw new Error('Deling door nul');
      return toNumericOperand(left, 'Linker operand') / divisor;
    }
    throw new Error(`Onbekende operator '${node.op}'`);
  }
  throw new Error(`Onbekend node-type '${node.type}'`);
}

function castResult(value, resultType = 'text') {
  if (resultType === 'number') return toNumericOperand(value, 'Resultaat');
  if (resultType === 'boolean') return toBoolean(value);
  if (resultType === 'date') {
    const date = toDateOrNull(value);
    if (!date) throw new Error('Resultaat is geen geldige datum');
    return date.toISOString();
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function evaluateCompiledFormula(compiled, rowValues = {}, options = {}) {
  if (!compiled || !compiled.ast) {
    return { value: null, error: 'Formule is niet gecompileerd' };
  }
  try {
    const rawValue = evalNode(compiled.ast, rowValues, 0);
    const value = castResult(rawValue, options.resultType || 'text');
    return { value, error: null };
  } catch (err) {
    return {
      value: null,
      error: err && err.message ? err.message : 'Fout tijdens formule-evaluatie',
    };
  }
}

function extractFormulaReferences(expression) {
  return [...compileFormula(expression).references];
}

module.exports = {
  MAX_FORMULA_LENGTH,
  MAX_TOKENS,
  MAX_EVAL_DEPTH,
  FormulaSyntaxError,
  compileFormula,
  evaluateCompiledFormula,
  extractFormulaReferences,
};
