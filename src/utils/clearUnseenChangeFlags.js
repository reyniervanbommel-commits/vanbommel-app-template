// Wis alleen de "ongeziene wijziging"-highlights. Bronstatus (removed in D365)
// blijft staan: Mark as seen is een watermerk, geen delete.

export function clearUnseenChangeFlagsOnLine(line) {
  if (!line || typeof line !== 'object') return line;
  return {
    ...line,
    isNew: false,
    isChanged: false,
    changedFieldKeys: [],
  };
}

export function clearUnseenChangeFlagsOnOrder(order) {
  if (!order || typeof order !== 'object') return order;
  const next = {
    ...order,
    isNew: false,
    isChanged: false,
    hasNewLine: false,
    hasChangedLine: false,
    hasRemovedLine: false,
    hasRemovalChange: false,
    changedFieldKeys: [],
  };
  if (Array.isArray(order.lines)) {
    next.lines = order.lines.map(clearUnseenChangeFlagsOnLine);
  }
  return next;
}

export function clearUnseenChangeFlagsOnOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(clearUnseenChangeFlagsOnOrder);
}

export function withClearedUnseenBoardCounts(payload, orders) {
  return {
    ...(payload && typeof payload === 'object' ? payload : {}),
    orders,
    newCount: 0,
    changedCount: 0,
  };
}
