'use strict';

require('dotenv').config({ override: true });
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SqlSessionStore = require('./services/SqlSessionStore');

const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const supplierRouter = require('./routes/supplier');
const dataRouter = require('./routes/data');
const dataLinksRouter = require('./routes/dataLinks');
const { requireSession, requireAnyRole, requireRole } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { ROLES } = require('./constants/roles');
const { logger } = require('./utils/logger');

// Robuustheid: een transiente fout buiten de request-keten (bv. een 'error'-event van de
// MSSQL-connection-pool of session-store bij een korte DB-hapering) zou anders een
// uncaughtException geven en het proces met exit 1 omleggen (crash-loop in containers).
// We loggen die gevallen i.p.v. crashen; de pool reconnect vanzelf bij de volgende query.
process.on('unhandledRejection', (reason) => {
  logger.error('Onverwerkte promise-rejection', { reason: reason && reason.message ? reason.message : String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Onverwerkte uitzondering', { error: err && err.stack ? err.stack : String(err) });
});

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json());

// Eigen MSSQL-session-store op de gedeelde app-pool (sql.connect), i.p.v. connect-mssql-v2.
// Die had een eigen losse pool met een race in ready(): bij parallelle requests vlak na login
// bleef store.get hangen (alleen in de container). Door dezelfde, bewezen werkende pool als de
// routes te gebruiken, verdwijnt die hang. Zie server/services/SqlSessionStore.js.
const sessionStore = new SqlSessionStore();
// Vang connectiefouten van de session-store op zodat een DB-hapering het proces niet omlegt.
sessionStore.on('error', (err) => {
  logger.error('Session-store fout', { error: err && err.message ? err.message : String(err) });
});
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET moet gezet zijn en minimaal 32 tekens bevatten');
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  name: process.env.SESSION_COOKIE_NAME || 'vendorportal.sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.SESSION_TTL_HOURS || '8') * 60 * 60 * 1000,
  },
}));

app.use('/api/auth', authRouter);
app.use('/api/admin', requireSession, requireAnyRole([ROLES.ADMIN, ROLES.EMPLOYEE]), adminRouter);
app.use('/api/supplier', requireSession, requireAnyRole([ROLES.SUPPLIER, ROLES.EMPLOYEE, 'user']), supplierRouter);
// Generieke Table Builder-data-API — het PO-board draait hier volledig op (po_*-laag verwijderd, #AB:177).
app.use('/api/data', requireSession, requireAnyRole([ROLES.ADMIN, ROLES.EMPLOYEE]), dataRouter);
// Excel-koppelingen naar hoofdtabellen (#AB:162) — admin-only (upload + fk_join-lookup publiceren).
app.use('/api/data-links', requireSession, requireRole(ROLES.ADMIN), dataLinksRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');

  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => console.log('Server gestart op poort ' + PORT));

module.exports = app;
