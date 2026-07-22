// Beschrijft welke functies in de formule-kolom beschikbaar zijn. Wordt gebruikt om:
// - klikbare "insert"-knoppen te tonen in PurchaseOrderFormulaFunctionsHelp
// - de helpteksten in de formuledialoog consistent te houden met de server-engine
//   (server/utils/tableFormulaEngine.js — hier alleen metadata, geen rekenlogica).
export const FORMULA_FUNCTIONS_HELP = [
  {
    name: 'TODAY()',
    snippet: 'TODAY()',
    description: "Today's date. Combine with a date column to get a number of days, e.g. TODAY()-(deliverydate).",
  },
  {
    name: 'IF(condition;true;false)',
    snippet: 'IF(;;)',
    description: 'Returns one value if the condition is true, another if false.',
  },
  {
    name: 'AFRONDEN(number;decimals)',
    snippet: 'AFRONDEN(;0)',
    description: 'Rounds a number, e.g. divide days by 7 and round to get whole weeks.',
  },
  {
    name: 'ABS(number)',
    snippet: 'ABS()',
    description: 'Absolute value, useful to ignore whether a delay is early or late.',
  },
  {
    name: 'MAX(number;number;...)',
    snippet: 'MAX(0;)',
    description: 'Largest of the given numbers, e.g. clamp a negative delay to 0.',
  },
  {
    name: 'MIN(number;number;...)',
    snippet: 'MIN(;)',
    description: 'Smallest of the given numbers.',
  },
];
