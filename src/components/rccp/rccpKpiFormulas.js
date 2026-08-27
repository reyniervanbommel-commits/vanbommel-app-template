export const KPI_FORMULAS = {
  ordered: 'open + delivered\non visible purchase-order lines',
  delivered: 'delivered\n% = delivered / ordered × 100',
  open: 'open\nitems = unique item numbers still open\n% = open / ordered × 100',
  lateDelivery: 'delivered where receipt date > comparison date\n(comparison = requested or confirmed planning date)\nitems = unique item numbers on those lines\n% = late / ordered × 100',
  lateItems: 'Ø = average of (receipt date − planned date)\nin calendar days, only where receipt date > planned date',
  onTime: 'delivered where receipt date ≤ comparison date\n1-1-1900 and missing comparison dates are excluded\nitems = unique item numbers\n% = on time / ordered × 100',
  openLate: 'open where comparison ISO week < current ISO week\n(comparison = requested or confirmed planning date)\nitems = unique item numbers on those lines\nØ days late = average of (today − comparison date)',
  planned1900: 'open + delivered where comparison date is missing or 1-1-1900\nRequested: planned date. Confirmed: confirmed date.\nitems = unique item numbers on those lines',
  capacityShortfall: 'sum of (open load − capacity)\nin weeks where load > capacity\nnot available on the purchase-order board',
  overloadedWeeks: 'count of weeks where open load > capacity\nnot available on the purchase-order board',
};
