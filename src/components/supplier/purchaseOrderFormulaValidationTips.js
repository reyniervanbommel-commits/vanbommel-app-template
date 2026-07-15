export function getFormulaValidationTip(message) {
  const text = String(message || '').toLowerCase();
  if (!text) return '';
  if (text.includes('expected eof') || text.includes('unexpected token')) {
    return 'Check parentheses and use IF(condition;true;false).';
  }
  if (text.includes('unknown column reference')) {
    return 'Use the column picker so the reference matches exactly.';
  }
  if (text.includes('formula cannot reference formula column')) {
    return 'Reference only regular master columns, not other formula columns.';
  }
  if (text.includes('formula is required')) {
    return 'Enter a formula first before validating or saving.';
  }
  if (text.includes('master columns')) {
    return 'Use only columns from the main table (master).';
  }
  if (text.includes('result type')) {
    return 'Choose a result type that matches your output, for example Text for \'smaller/larger\'.';
  }
  return 'Check syntax, column names, and semicolon separators.';
}
