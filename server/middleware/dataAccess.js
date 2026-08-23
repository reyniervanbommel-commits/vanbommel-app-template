'use strict';

// Toegangscontrole voor de generieke Table Builder-data-API (/api/data).
// - admin / employee: volledige toegang (lezen, muteren, admin-functies).
// - supplier: lezen van eigen purchase-orders + remarks/history/activity op eigen rijen,
//   reaction-toggle op remarks en het plaatsen van eigen comments (scope-check op rijniveau
//   gebeurt in RowRemarksService.context -> assertSupplierPurchaseOrderRow).
const { ROLES } = require('../constants/roles');

const SUPPLIER_READ_PATHS = new Set(['/purchase-orders', '/purchase-orders/columns']);

function normalizeDataPath(req) {
  return (req.path || '/').replace(/\/+$/, '') || '/';
}

function isSupplierAllowedDataRequest(req) {
  const rel = normalizeDataPath(req);
  const { method } = req;

  if (method === 'GET' && SUPPLIER_READ_PATHS.has(rel)) return true;
  if (!rel.startsWith('/purchase-orders/')) return false;

  if (method === 'GET') {
    if (rel === '/purchase-orders/history') return true;
    if (rel === '/purchase-orders/remarks/summary') return true;
    if (rel === '/purchase-orders/remarks') return true;
    if (rel === '/purchase-orders/activity') return true;
  }

  if (method === 'PUT' && /^\/purchase-orders\/remarks\/\d+\/reaction$/.test(rel)) return true;

  // Suppliers mogen een eigen comment plaatsen op een order binnen hun scope. De
  // rij-scope wordt server-side afgedwongen in RowRemarksService.context().
  if (method === 'POST' && rel === '/purchase-orders/remarks') return true;
  if (method === 'POST' && rel === '/purchase-orders/viewed') return true;

  return false;
}

function restrictSupplierDataAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const role = req.user.role;
  if (role === ROLES.ADMIN || role === ROLES.EMPLOYEE) return next();

  if (role === ROLES.SUPPLIER && isSupplierAllowedDataRequest(req)) return next();

  return res.status(403).json({ error: 'Access denied — insufficient permissions' });
}

module.exports = { restrictSupplierDataAccess };
