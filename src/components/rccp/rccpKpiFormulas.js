export const KPI_FORMULAS = {
  ordered: 'open + delivered\non visible purchase-order lines',
  delivered: 'delivered\n% = delivered / ordered × 100',
  open: 'open\nitems = unique item numbers still open\n% = open / ordered × 100',
  lateDelivery: 'delivered where receipt date > planned date\nitems = unique item numbers on those lines\n% = late / ordered × 100',
  lateItems: 'Ø = average of (receipt date − planned date)\nin calendar days, only where receipt date > planned date',
  onTime: 'delivered where receipt date ≤ planned date\n1-1-1900 and missing receipt dates are excluded\nitems = unique item numbers\n% = on time / ordered × 100',
  openLate: 'open where planned ISO week < current ISO week\nitems = unique item numbers on those lines\nØ days late = average of (today − planned date)',
  planned1900: 'open + delivered where planned date is 1-1-1900\n(D365 empty date)\nitems = unique item numbers on those lines',
  validDates: 'ordered − 1-1-1900\n% = valid / ordered × 100\nclick filters orders with a 1-1-1900 date',
  deliveryReliability: 'on-time / delivered × 100\nonly received units, not still-open volume\nclick filters on-time orders',
  capacityShortfall: 'sum of (open load − capacity)\nin weeks where load > capacity\nnot available on the purchase-order board',
  overloadedWeeks: 'count of weeks where open load > capacity\nnot available on the purchase-order board',
};
