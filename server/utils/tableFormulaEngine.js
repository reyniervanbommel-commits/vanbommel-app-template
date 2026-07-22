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
    super(position === null ? message : `${message} (position ${position})`);
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
        throw new FormulaSyntaxError('String literal is not closed', i);
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
        throw new FormulaSyntaxError('Invalid number', i);
      }
      const raw = text.slice(i, j);
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        throw new FormulaSyntaxError('Invalid number', i);
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

    throw new FormulaSyntaxError(`Unknown character '${ch}'`, i);
  }

  if (tokens.length > MAX_TOKENS) {
    throw new FormulaSyntaxError(`Formula contains too many tokens (max ${MAX_TOKENS})`);
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
      throw new FormulaSyntaxError(`Expected ${type}, got ${token.type}`, token.position);
    }
    if (value && token.value !== value) {
      throw new FormulaSyntaxError(`Expected '${value}', got '${token.value}'`, token.position);
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
      throw new FormulaSyntaxError(`Unknown identifier '${ident}'`, token.position);
    }
    if (token.type === TOKEN_TYPES.LPAREN) {
      parenDepth += 1;
      if (parenDepth > MAX_EVAL_DEPTH) {
        throw new FormulaSyntaxError(`Nesting too deep (max ${MAX_EVAL_DEPTH})`, token.position);
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
    throw new FormulaSyntaxError(`Unexpected token '${token.type}'`, token.position);
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
    throw new FormulaSyntaxError('Formula is required');
  }
  if (normalized.length > MAX_FORMULA_LENGTH) {
    throw new FormulaSyntaxError(`Formula is too long (max ${MAX_FORMULA_LENGTH} characters)`);
  }
  if (normalized.startsWith('=')) normalized = normalized.slice(1).trim();
  if (!normalized) {
    throw new FormulaSyntaxError('Formula is required');
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

function toNumericOperand(value, label = 'Value') {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} is not a valid number`);
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && isNumericString(value)) return Number(value.trim());
  throw new Error(`${label} cannot be used as a number`);
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
    cmp = toNumericOperand(left, 'Left value') - toNumericOperand(right, 'Right value');
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
  throw new Error(`Unknown comparator '${op}'`);
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

// Middernacht UTC van de gegeven datum (of nu). Datumkolommen worden al als
// UTC-middernacht opgeslagen (zie daysBetween/addDays), dus TODAY() sluit
// daar 1-op-1 op aan en levert altijd een heel aantal dagen op, ongeacht het
// tijdstip van de dag waarop de formule wordt uitgerekend.
function getUtcMidnight(referenceDate = new Date()) {
  const out = new Date(referenceDate.getTime());
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function roundToDecimals(value, decimals) {
  const digits = Math.trunc(decimals);
  if (digits < 0 || digits > 10) throw new Error('AFRONDEN/ROUND decimals must be between 0 and 10');
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// Functie-dispatchtabel voor formule-calls. Elke functie krijgt de reeds
// geëvalueerde argumentwaarden (geen AST-nodes) en het evaluatiecontext
// (o.a. `today`). Nieuwe functies toevoegen = hier één entry toevoegen; de
// tokenizer/parser ondersteunen willekeurige `NAAM(...)`-calls al generiek.
const FORMULA_FUNCTIONS = {
  TODAY: {
    minArgs: 0,
    maxArgs: 0,
    apply: (args, context) => context.today,
  },
  AFRONDEN: {
    minArgs: 1,
    maxArgs: 2,
    apply: (args) => roundToDecimals(
      toNumericOperand(args[0], 'AFRONDEN/ROUND value'),
      args.length > 1 ? toNumericOperand(args[1], 'AFRONDEN/ROUND decimals') : 0
    ),
  },
  ROUND: {
    minArgs: 1,
    maxArgs: 2,
    apply: (args) => FORMULA_FUNCTIONS.AFRONDEN.apply(args),
  },
  ABS: {
    minArgs: 1,
    maxArgs: 1,
    apply: (args) => Math.abs(toNumericOperand(args[0], 'ABS value')),
  },
  MAX: {
    minArgs: 1,
    maxArgs: 64,
    apply: (args) => Math.max(...args.map((value, index) => toNumericOperand(value, `MAX argument ${index + 1}`))),
  },
  MIN: {
    minArgs: 1,
    maxArgs: 64,
    apply: (args) => Math.min(...args.map((value, index) => toNumericOperand(value, `MIN argument ${index + 1}`))),
  },
};

function evalNode(node, rowValues, depth = 0, context = {}) {
  if (!node || typeof node !== 'object') throw new Error('Invalid formula node');
  if (depth > MAX_EVAL_DEPTH) throw new Error(`Evaluation too deep (max ${MAX_EVAL_DEPTH})`);

  if (node.type === 'number') return node.value;
  if (node.type === 'string') return node.value;
  if (node.type === 'ref') {
    const key = String(node.key);
    if (!Object.prototype.hasOwnProperty.call(rowValues || {}, key)) {
      throw new Error(`Unknown column reference '${key}'`);
    }
    return rowValues[key];
  }
  if (node.type === 'unary') {
    const value = evalNode(node.argument, rowValues, depth + 1, context);
    if (node.op === '+') return toNumericOperand(value, 'Unary plus');
    if (node.op === '-') return -toNumericOperand(value, 'Unary minus');
    throw new Error(`Unknown unary operator '${node.op}'`);
  }
  if (node.type === 'call') {
    if (node.name === 'ALS' || node.name === 'IF') {
      if (!Array.isArray(node.args) || node.args.length !== 3) {
        throw new Error('IF expects exactly 3 arguments');
      }
      const condition = evalNode(node.args[0], rowValues, depth + 1, context);
      return toBoolean(condition)
        ? evalNode(node.args[1], rowValues, depth + 1, context)
        : evalNode(node.args[2], rowValues, depth + 1, context);
    }
    const fn = FORMULA_FUNCTIONS[node.name];
    if (!fn) throw new Error(`Unknown function '${node.name}'`);
    const argCount = Array.isArray(node.args) ? node.args.length : 0;
    if (argCount < fn.minArgs || argCount > fn.maxArgs) {
      throw new Error(`${node.name} expects ${fn.minArgs === fn.maxArgs ? fn.minArgs : `${fn.minArgs}-${fn.maxArgs}`} argument(s)`);
    }
    const args = (node.args || []).map((arg) => evalNode(arg, rowValues, depth + 1, context));
    return fn.apply(args, context);
  }
  if (node.type === 'binary') {
    const left = evalNode(node.left, rowValues, depth + 1, context);
    const right = evalNode(node.right, rowValues, depth + 1, context);

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
      const leftNumber = toNumericOperand(left, 'Left operand');
      const rightNumber = toNumericOperand(right, 'Right operand');
      return node.op === '+' ? leftNumber + rightNumber : leftNumber - rightNumber;
    }

    if (node.op === '*') {
      return toNumericOperand(left, 'Left operand') * toNumericOperand(right, 'Right operand');
    }
    if (node.op === '/') {
      const divisor = toNumericOperand(right, 'Right operand');
      if (divisor === 0) throw new Error('Division by zero');
      return toNumericOperand(left, 'Left operand') / divisor;
    }
    throw new Error(`Unknown operator '${node.op}'`);
  }
  throw new Error(`Unknown node type '${node.type}'`);
}

function castResult(value, resultType = 'text') {
  if (resultType === 'number') return toNumericOperand(value, 'Result');
  if (resultType === 'boolean') return toBoolean(value);
  if (resultType === 'date') {
    const date = toDateOrNull(value);
    if (!date) throw new Error('Result is not a valid date');
    return date.toISOString();
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function evaluateCompiledFormula(compiled, rowValues = {}, options = {}) {
  if (!compiled || !compiled.ast) {
    return { value: null, error: 'Formula is not compiled' };
  }
  // `today` wordt idealiter één keer per read/aanroep-batch meegegeven (zie
  // TableDataService), zodat TODAY() voor alle rijen en formules identiek is
  // en er geen extra Date-object per rij nodig is dan wat hier al gebeurt.
  const context = { today: options.today instanceof Date ? options.today : getUtcMidnight() };
  try {
    const rawValue = evalNode(compiled.ast, rowValues, 0, context);
    const value = castResult(rawValue, options.resultType || 'text');
    return { value, error: null };
  } catch (err) {
    return {
      value: null,
      error: err && err.message ? err.message : 'Error during formula evaluation',
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
  FORMULA_FUNCTIONS,
  FormulaSyntaxError,
  compileFormula,
  evaluateCompiledFormula,
  extractFormulaReferences,
  getUtcMidnight,
};
